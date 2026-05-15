// ============================================================
// Watchdog: verifica se os agentes rodaram quando deveriam e se
// o site está de pé. Roda toda manhã (sugestão: 9h).
//
// Detecta:
//   - Dev Agent não rodou ontem (deveria rodar 20h)
//   - CEO Agent não rodou na última sexta
//   - Sessão "pendurada": começou (session_started) mas não
//     terminou (sem card_completed/session_ended depois)
//   - Site fora do ar: production_health com ok=false nas últimas 24h
//
// Envia alerta no Telegram quando detecta problemas.
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;

if (!SUPA_URL || !SUPA_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) {
    console.warn('Telegram nao configurado — alerta nao enviado');
    console.log(text);
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram API:', data.description);
  } catch (err) {
    console.error('Erro ao enviar Telegram:', err.message);
  }
}

function toBRDate(d) {
  return d.toLocaleDateString('pt-BR');
}

async function getLastLog(agent, action) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('agent', agent)
    .eq('action', action)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return new Date(data.created_at);
}

const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const alerts = [];

// ── Check 1: Dev Agent deveria ter rodado ontem (20h) ──────────────
const devStart = await getLastLog('dev_agent', 'session_started');
if (!devStart) {
  alerts.push(`⚠️ *Dev Agent* — nunca rodou ainda (sem registro no banco).`);
} else {
  const devStartDay = new Date(devStart);
  devStartDay.setHours(0, 0, 0, 0);
  if (devStartDay < yesterday) {
    const diff = Math.floor((today - devStartDay) / 86400000);
    alerts.push(
      `⚠️ *Dev Agent* — última execução foi *${toBRDate(devStartDay)}* ` +
      `(${diff} dia${diff > 1 ? 's' : ''} atrás). Deveria rodar todo dia às 20h.`
    );
  } else {
    // ── Check 2: heartbeat fino — sessão começou mas terminou? ────
    const devEnded = await getLastLog('dev_agent', 'session_ended');
    const devCompleted = await getLastLog('dev_agent', 'card_completed');
    const lastFinish = Math.max(
      devEnded ? devEnded.getTime() : 0,
      devCompleted ? devCompleted.getTime() : 0,
    );
    const hoursSinceStart = (now - devStart) / 3600_000;
    // Se a sessão começou há mais de 2h e não há sinal de término depois dela
    if (hoursSinceStart > 2 && lastFinish < devStart.getTime()) {
      alerts.push(
        `⚠️ *Dev Agent* — sessão de ${toBRDate(devStart)} começou mas não terminou ` +
        `(sem \`card_completed\` nem \`session_ended\`). Pode ter travado, ficado sem ` +
        `tokens no meio, ou batido o limite de tempo da task.`
      );
    }
  }
}

// ── Check 3: CEO Agent deveria ter rodado na última sexta ──────────
const ceoStart = await getLastLog('ceo_agent', 'session_started');
const dow = now.getDay(); // 0=dom, 5=sex, 6=sab
const daysSinceFriday = dow >= 5 ? dow - 5 : dow + 2;
const lastFriday = new Date(today);
lastFriday.setDate(lastFriday.getDate() - daysSinceFriday);
const lastFridayDeadline = new Date(lastFriday);
lastFridayDeadline.setHours(20, 30, 0, 0);

if (now >= lastFridayDeadline) {
  if (!ceoStart) {
    alerts.push(`⚠️ *CEO Agent* — nunca rodou ainda.`);
  } else {
    const ceoStartDay = new Date(ceoStart);
    ceoStartDay.setHours(0, 0, 0, 0);
    if (ceoStartDay < lastFriday) {
      alerts.push(
        `⚠️ *CEO Agent* — última execução foi *${toBRDate(ceoStartDay)}*. ` +
        `Deveria ter rodado na sexta (${toBRDate(lastFriday)}).`
      );
    }
  }
}

// ── Check 4: último E2E (activity_logs) ────────────────────────────
try {
  const { data: lastE2E } = await supabase
    .from('activity_logs')
    .select('action, details, created_at')
    .eq('agent', 'e2e_monitor')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastE2E) {
    const ageHours = (now - new Date(lastE2E.created_at)) / 3600_000;
    if (lastE2E.action === 'e2e_failed') {
      alerts.push(
        `🔴 *E2E falhou* na última execução (${toBRDate(new Date(lastE2E.created_at))}). ` +
        `Card de bug foi criado no kanban.`
      );
    } else if (ageHours > 30) {
      // E2E roda diário às 19h30; mais de 30h sem registro = task não rodou
      alerts.push(
        `⚪ *Kinto E2E* — última execução há ${Math.floor(ageHours)}h. ` +
        `A task pode não estar configurada ou não rodou.`
      );
    }
  }
} catch (err) {
  console.error('Erro ao checar E2E:', err.message);
}

// ── Check 5: saúde do site (production_health últimas 24h) ─────────
try {
  const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const { data: health } = await supabase
    .from('production_health')
    .select('url, ok, http_status, latency_ms, error, checked_at')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false });

  if (health && health.length > 0) {
    // Pega o run mais recente: agrupa pela checked_at mais recente
    const failures = health.filter(h => !h.ok);
    if (failures.length > 0) {
      // Deduplica por URL (pega a falha mais recente de cada)
      const seen = new Set();
      const lines = [];
      for (const f of failures) {
        if (seen.has(f.url)) continue;
        seen.add(f.url);
        lines.push(`  • ${f.url} — ${f.error || 'HTTP ' + f.http_status}`);
      }
      alerts.push(
        `🔴 *Site com problema* (smoke test nas últimas 24h):\n${lines.join('\n')}`
      );
    }
  } else {
    // Sem dados de saúde — o smoke test pode não ter rodado
    alerts.push(
      `⚪ *Smoke test* — sem registros de saúde nas últimas 24h. ` +
      `A task "Kinto Smoke Test" pode não estar configurada ou não rodou.`
    );
  }
} catch (err) {
  console.error('Erro ao checar production_health:', err.message);
}

// ── Resultado ──────────────────────────────────────────────────────
if (alerts.length === 0) {
  console.log('Watchdog OK — agentes e site em dia.');
  process.exit(0);
}

const message =
  `🔔 *Watchdog dos agentes Kinto*\n\n` +
  alerts.join('\n\n') +
  `\n\n_Possíveis causas: PC desligado no horário, falta de tokens no Claude, ` +
  `erro de conexão, deploy quebrado ou bug nos scripts._\n\n` +
  `Veja o runbook: \`docs/RUNBOOK.md\``;

await sendTelegram(message);
console.log('Alerta enviado:\n' + message);
