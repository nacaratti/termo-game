// ============================================================
// Watchdog: verifica se os agentes rodaram quando deveriam.
// Roda toda manha (sugestao: 9h via Task Scheduler).
//
// Detecta:
//   - Dev Agent nao rodou ontem (deveria ter rodado as 20h)
//   - CEO Agent nao rodou na ultima sexta (se hoje for sabado/domingo)
//
// Envia alerta no Telegram quando detecta falhas.
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

// Helpers de data
function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function toBRDate(d) {
  return d.toLocaleDateString('pt-BR');
}

async function getLastSessionDate(agent) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('agent', agent)
    .eq('action', 'session_started')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return new Date(data.created_at);
}

const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = ymd(yesterday);

const alerts = [];

// ── Check 1: Dev Agent deveria ter rodado ontem (20h)
const devLast = await getLastSessionDate('dev_agent');
if (!devLast) {
  alerts.push(`⚠️ *Dev Agent* — nunca rodou ainda (sem registro no banco)`);
} else {
  const devLastDate = new Date(devLast);
  devLastDate.setHours(0, 0, 0, 0);
  // Se a ultima execucao foi antes de ontem, e ontem ja passou (hoje >= ontem+1), avisa
  if (devLastDate < yesterday) {
    const diff = Math.floor((today - devLastDate) / 86400000);
    alerts.push(
      `⚠️ *Dev Agent* — última execução foi *${toBRDate(devLastDate)}* ` +
      `(${diff} dia${diff > 1 ? 's' : ''} atrás). Deveria rodar todo dia às 20h.`
    );
  }
}

// ── Check 2: CEO Agent deveria ter rodado na ultima sexta
const ceoLast = await getLastSessionDate('ceo_agent');
const dow = now.getDay(); // 0=dom, 5=sex, 6=sab
const daysSinceFriday = dow >= 5 ? dow - 5 : dow + 2; // ate quantos dias atras foi a ultima sexta
const lastFriday = new Date(today);
lastFriday.setDate(lastFriday.getDate() - daysSinceFriday);

// So checa se a ultima sexta ja passou de fato (apos 20h)
const lastFridayDeadline = new Date(lastFriday);
lastFridayDeadline.setHours(20, 30, 0, 0);

if (now >= lastFridayDeadline) {
  if (!ceoLast) {
    alerts.push(`⚠️ *CEO Agent* — nunca rodou ainda.`);
  } else {
    const ceoLastDate = new Date(ceoLast);
    ceoLastDate.setHours(0, 0, 0, 0);
    if (ceoLastDate < lastFriday) {
      alerts.push(
        `⚠️ *CEO Agent* — última execução foi *${toBRDate(ceoLastDate)}*. ` +
        `Deveria ter rodado na sexta (${toBRDate(lastFriday)}).`
      );
    }
  }
}

if (alerts.length === 0) {
  console.log('Watchdog OK — agentes em dia.');
  process.exit(0);
}

const message =
  `🔔 *Watchdog dos agentes Kinto*\n\n` +
  alerts.join('\n\n') +
  `\n\n_Possíveis causas: PC desligado no horário, falta de tokens no Claude, erro de conexão, ou bug nos scripts._\n\n` +
  `Rode manualmente para recuperar:\n` +
  `\`scripts\\run-dev-agent.bat\``;

await sendTelegram(message);
console.log('Alerta enviado:\n' + message);
