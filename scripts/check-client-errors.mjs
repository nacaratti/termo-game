// ============================================================
// Verificador de erros de cliente — sensor determinístico.
// Lê client_errors não vistos, agrupa por mensagem e cria um
// card de bug por grupo relevante. Detalhe técnico (stack) vai
// só em activity_logs, nunca no card público.
//
// Roda junto do smoke test (run-smoke-test.bat) ou standalone.
//
// Uso manual: node scripts/check-client-errors.mjs
// ============================================================
import {
  getUnseenClientErrors,
  markClientErrorsSeen,
  findOpenCardByTitle,
  createCard,
  logActivity,
} from './supabase-agent.mjs';
import { sendMessage } from './telegram.mjs';

// Mensagens de erro comuns e inofensivas que não viram card
const IGNORE_PATTERNS = [
  /ResizeObserver loop/i,
  /Script error\.?$/i,            // erros cross-origin sem detalhe útil
  /Non-Error promise rejection/i,
];

function shouldIgnore(message) {
  return IGNORE_PATTERNS.some(re => re.test(message || ''));
}

// Normaliza a mensagem para agrupar variações (remove números, URLs)
function groupKey(message) {
  return String(message || '')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\d+/g, 'N')
    .slice(0, 120)
    .trim();
}

async function main() {
  let errors;
  try {
    errors = await getUnseenClientErrors(200);
  } catch (err) {
    console.error('[check-client-errors] Falha ao ler client_errors:', err.message);
    process.exit(1);
  }

  if (!errors || errors.length === 0) {
    console.log('[check-client-errors] Nenhum erro novo.');
    return;
  }

  // Agrupa por mensagem normalizada
  const groups = new Map(); // key → { sample, count, ids, urls }
  for (const e of errors) {
    if (shouldIgnore(e.message)) continue;
    const key = groupKey(e.message);
    if (!groups.has(key)) {
      groups.set(key, { sample: e, count: 0, ids: [], urls: new Set() });
    }
    const g = groups.get(key);
    g.count += 1;
    g.ids.push(e.id);
    if (e.url) g.urls.add(e.url);
  }

  console.log(`[check-client-errors] ${errors.length} erros, ${groups.size} grupo(s) relevante(s).`);

  let cardsCreated = 0;
  for (const [key, g] of groups) {
    const cardTitle = `Erro de runtime para usuários: ${key.slice(0, 60)}`;
    try {
      const existing = await findOpenCardByTitle(cardTitle, 24);
      if (!existing) {
        await createCard({
          title: cardTitle,
          description: `O monitoramento detectou um erro de JavaScript afetando jogadores (${g.count} ocorrência${g.count > 1 ? 's' : ''}). Investigar a causa e corrigir.`,
          priority: 2,
          labels: ['bug', 'internal'],
          created_by: 'error_monitor',
        });
        cardsCreated += 1;
      }
      // Detalhe técnico (stack, URLs) vai só no activity_logs
      await logActivity({
        agent: 'error_monitor',
        action: 'client_error_detected',
        details: {
          group: key,
          count: g.count,
          urls: [...g.urls],
          sample_message: g.sample.message,
          sample_stack: g.sample.stack,
        },
      });
    } catch (err) {
      console.error(`[check-client-errors] Falha no grupo "${key}":`, err.message);
    }
  }

  // Marca todos como vistos (inclusive os ignorados, para não reprocessar)
  try {
    await markClientErrorsSeen(errors.map(e => e.id));
  } catch (err) {
    console.error('[check-client-errors] Falha ao marcar como vistos:', err.message);
  }

  if (cardsCreated > 0) {
    try {
      await sendMessage(
        `⚠️ *Erros de runtime detectados*\n\n` +
        `${cardsCreated} novo(s) tipo(s) de erro afetando jogadores. ` +
        `Card(s) de bug criado(s) no kanban para o Dev Agent investigar.`
      );
    } catch (err) {
      console.error('[check-client-errors] Falha ao enviar Telegram:', err.message);
    }
  }

  console.log(`[check-client-errors] ${cardsCreated} card(s) criado(s).`);
}

main().catch(err => {
  console.error('[check-client-errors] Erro inesperado:', err.message);
  process.exit(1);
});
