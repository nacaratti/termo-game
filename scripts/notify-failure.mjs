// ============================================================
// Notificacao de falha de agente via Telegram.
// Chamado pelos .bat quando claude --print retorna exit code != 0.
//
// Uso: node scripts/notify-failure.mjs <agent> <exit_code>
// ============================================================
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;

const [,, agent = 'unknown', exitCode = '?'] = process.argv;

const labels = {
  dev_agent: '⚙ Dev Agent',
  ceo_agent: '📋 CEO Agent',
};
const agentLabel = labels[agent] || agent;

const reasons = {
  '1': 'erro genérico (geralmente bug no prompt ou ferramenta)',
  '127': 'comando claude não encontrado — verifique a instalação',
  '130': 'execução interrompida (Ctrl+C ou timeout)',
};
const reasonHint = reasons[exitCode] || `código de saída ${exitCode}`;

const now = new Date().toLocaleString('pt-BR');

const message =
  `🚨 *Falha na execução de agente*\n\n` +
  `${agentLabel} encerrou com erro às *${now}*.\n` +
  `Motivo provável: ${reasonHint}.\n\n` +
  `*Possíveis causas:*\n` +
  `- Token do Claude Code esgotado/expirado\n` +
  `- Sem conexão com internet\n` +
  `- Erro no Supabase ou nos prompts\n` +
  `- Conta sem créditos\n\n` +
  `Rode manualmente para investigar:\n` +
  `\`scripts\\run-${agent.replace('_agent','')}-agent.bat\``;

if (!TG_TOKEN || !TG_CHAT) {
  console.error('Telegram nao configurado — falha registrada apenas no console');
  console.log(message);
  process.exit(0);
}

try {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text: message, parse_mode: 'Markdown' }),
  });
  const data = await res.json();
  if (!data.ok) console.error('Telegram API:', data.description);
  else console.log('Alerta enviado.');
} catch (err) {
  console.error('Erro ao enviar Telegram:', err.message);
}
