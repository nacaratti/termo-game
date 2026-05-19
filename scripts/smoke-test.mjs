// ============================================================
// Smoke test sintético — sensor determinístico (NÃO usa LLM).
// Bate nas URLs críticas do site em produção, mede status HTTP +
// latência, grava em production_health. Se algo falhar:
//   - cria card priority 3 (bug+internal, idempotente em 24h)
//   - loga detalhe técnico em activity_logs
//   - dispara alerta no Telegram
//
// Roda via Task Scheduler (run-smoke-test.bat), tipicamente 08h30.
//
// Uso manual: node scripts/smoke-test.mjs
// ============================================================
import {
  recordHealth,
  findOpenCardByTitle,
  createCard,
  logActivity,
} from './supabase-agent.mjs';
import { sendMessage } from './telegram.mjs';

const SITE_URL = (process.env.SITE_URL || 'https://kinto.fun').replace(/\/$/, '');
const PATHS = ['/', '/6', '/changelog', '/comments'];
const LATENCY_LIMIT_MS = 5000; // acima disso, considera não-ok mesmo com 200
const FETCH_TIMEOUT_MS = 10000;
const RETRY_ON_SLOW = true; // se lento na 1ª req, tenta 1x mais (warm CDN)

function genRunId() {
  return (globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}`);
}

async function fetchOnce(url) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
  clearTimeout(timer);
  return { status: res.status, latency_ms: Date.now() - started };
}

async function checkUrl(path, runId) {
  const url = `${SITE_URL}${path}`;
  const row = { url: path, run_id: runId, http_status: null, latency_ms: null, ok: false, error: null };

  try {
    let result = await fetchOnce(url);

    // Se a 1ª req foi lenta, faz 1 retry para eliminar cold start de CDN
    if (RETRY_ON_SLOW && result.latency_ms >= LATENCY_LIMIT_MS && result.status >= 200 && result.status < 400) {
      await new Promise(r => setTimeout(r, 500));
      result = await fetchOnce(url);
    }

    row.latency_ms = result.latency_ms;
    row.http_status = result.status;
    row.ok = result.status >= 200 && result.status < 400 && row.latency_ms < LATENCY_LIMIT_MS;
    if (!row.ok) {
      row.error = result.status >= 400
        ? `HTTP ${result.status}`
        : `Latência alta: ${row.latency_ms}ms`;
    }
  } catch (err) {
    row.error = err.name === 'AbortError' ? `Timeout após ${FETCH_TIMEOUT_MS}ms` : err.message;
    if (row.latency_ms === null) row.latency_ms = FETCH_TIMEOUT_MS;
  }

  return row;
}

async function main() {
  const runId = genRunId();
  console.log(`[smoke-test] Verificando ${SITE_URL} (run ${runId})`);

  const rows = [];
  for (const path of PATHS) {
    const row = await checkUrl(path, runId);
    rows.push(row);
    const tag = row.ok ? 'OK ' : 'FALHA';
    console.log(`  [${tag}] ${path} — ${row.http_status ?? '—'} — ${row.latency_ms ?? '—'}ms${row.error ? ' — ' + row.error : ''}`);
  }

  // Grava todas as linhas em production_health
  try {
    await recordHealth(rows);
  } catch (err) {
    console.error('[smoke-test] Falha ao gravar production_health:', err.message);
  }

  const failures = rows.filter(r => !r.ok);
  if (failures.length === 0) {
    console.log('[smoke-test] Tudo OK.');
    return;
  }

  // ── Há falhas: card idempotente + log + Telegram ──────────────────
  const cardTitle = 'Site fora do ar ou lento em produção';
  const failureList = failures.map(f => `${f.url} (${f.error})`).join(', ');

  let cardCreated = false;
  try {
    const existing = await findOpenCardByTitle(cardTitle, 24);
    if (!existing) {
      await createCard({
        title: cardTitle,
        description: 'O monitoramento automático detectou que uma ou mais páginas do site não responderam corretamente. Investigar e restaurar o funcionamento normal.',
        priority: 3,
        labels: ['bug', 'internal'],
        created_by: 'smoke_test',
      });
      cardCreated = true;
    }
  } catch (err) {
    console.error('[smoke-test] Falha ao criar/checar card:', err.message);
  }

  // Detalhe técnico vai só no activity_logs (não no card público)
  try {
    await logActivity({
      agent: 'smoke_test',
      action: 'health_check_failed',
      details: { run_id: runId, failures, site: SITE_URL, card_created: cardCreated },
    });
  } catch (err) {
    console.error('[smoke-test] Falha ao logar activity:', err.message);
  }

  try {
    await sendMessage(
      `🔴 *Smoke test falhou*\n\n` +
      `Site: ${SITE_URL}\n` +
      `Páginas com problema: ${failureList}\n\n` +
      (cardCreated
        ? `Card de prioridade alta criado no kanban — o Dev Agent vai pegar na próxima sessão.`
        : `Já existe um card aberto para isso (não duplicado).`)
    );
  } catch (err) {
    console.error('[smoke-test] Falha ao enviar Telegram:', err.message);
  }

  // Exit code != 0 sinaliza falha para o .bat (que pode encadear notify-failure)
  process.exitCode = 1;
}

main().catch(err => {
  console.error('[smoke-test] Erro inesperado:', err.message);
  process.exit(1);
});
