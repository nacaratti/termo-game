// ============================================================
// E2E run — sensor determinístico (NÃO usa LLM).
// Roda os testes Playwright contra produção (kinto.fun). Se algum
// falha:
//   - cria card priority 3 (bug+internal, idempotente em 24h)
//   - loga detalhe técnico (nome do teste, mensagem) em activity_logs
//   - dispara alerta no Telegram
//
// Roda via Task Scheduler (run-e2e.bat), tipicamente 19h30.
//
// Uso manual: node scripts/e2e-run.mjs
// ============================================================
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import {
  findOpenCardByTitle,
  createCard,
  logActivity,
} from './supabase-agent.mjs';
import { sendMessage } from './telegram.mjs';

function runPlaywright() {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['playwright', 'test'], {
      shell: true,
      stdio: 'inherit',
    });
    proc.on('exit', (code) => resolve(code ?? 1));
  });
}

function parseResults() {
  const path = 'playwright-report/results.json';
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.warn('[e2e] Falha ao parsear results.json:', err.message);
    return null;
  }
}

function collectFailures(results) {
  if (!results?.suites) return [];
  const failures = [];
  function walk(suite, path = []) {
    const newPath = [...path, suite.title].filter(Boolean);
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const lastResult = t.results?.[t.results.length - 1];
        if (lastResult && lastResult.status !== 'passed' && lastResult.status !== 'skipped') {
          failures.push({
            file: spec.file || newPath.join(' > '),
            title: spec.title,
            error: lastResult.error?.message?.slice(0, 500) || `Status: ${lastResult.status}`,
          });
        }
      }
    }
    for (const s of suite.suites || []) walk(s, newPath);
  }
  for (const s of results.suites) walk(s);
  return failures;
}

async function main() {
  console.log('[e2e] Iniciando Playwright contra produção…');
  const exitCode = await runPlaywright();
  const results = parseResults();
  const failures = collectFailures(results);

  console.log(`[e2e] Exit code: ${exitCode}, falhas: ${failures.length}`);

  if (exitCode === 0 && failures.length === 0) {
    console.log('[e2e] Tudo OK.');
    // Loga sucesso para o watchdog poder confirmar que rodou
    try {
      await logActivity({
        agent: 'e2e_monitor',
        action: 'e2e_passed',
        details: { stats: results?.stats || null },
      });
    } catch { /* ignore */ }
    return;
  }

  // ── Há falhas: card idempotente + log + Telegram ──────────────────
  const cardTitle = 'Falha em testes E2E de produção';
  const failureSummary = failures.length === 0
    ? `Exit code ${exitCode}`
    : failures.slice(0, 3).map(f => f.title).join('; ') + (failures.length > 3 ? '…' : '');

  let cardCreated = false;
  try {
    const existing = await findOpenCardByTitle(cardTitle, 24);
    if (!existing) {
      await createCard({
        title: cardTitle,
        description: 'Os testes automáticos contra o site em produção detectaram comportamento inesperado. Investigar e restaurar o funcionamento normal dos fluxos críticos.',
        priority: 3,
        labels: ['bug', 'internal'],
        created_by: 'e2e_monitor',
      });
      cardCreated = true;
    }
  } catch (err) {
    console.error('[e2e] Falha ao criar/checar card:', err.message);
  }

  try {
    await logActivity({
      agent: 'e2e_monitor',
      action: 'e2e_failed',
      details: { exit_code: exitCode, failures, card_created: cardCreated },
    });
  } catch (err) {
    console.error('[e2e] Falha ao logar:', err.message);
  }

  try {
    await sendMessage(
      `🔴 *E2E falhou*\n\n` +
      `${failures.length} teste(s) falharam: ${failureSummary}\n\n` +
      (cardCreated
        ? `Card priority 3 criado no kanban — o Dev Agent pega na próxima sessão.`
        : `Já existe card aberto para isso (não duplicado).`)
    );
  } catch (err) {
    console.error('[e2e] Falha ao enviar Telegram:', err.message);
  }

  process.exitCode = 1;
}

main().catch(err => {
  console.error('[e2e] Erro inesperado:', err.message);
  process.exit(1);
});
