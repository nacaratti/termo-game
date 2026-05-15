// ============================================================
// Wrapper da API do Telegram Bot.
// Pode ser importado por outros scripts (sendMessage) ou usado
// via CLI: node scripts/telegram.mjs "mensagem aqui"
// ============================================================
import { fileURLToPath } from 'url';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Envia uma mensagem via Telegram. Se as credenciais não estiverem
 * configuradas, não lança — apenas avisa no console e retorna null.
 * Assim, um script que depende disso não quebra por falta de Telegram.
 */
export async function sendMessage(text) {
  if (!TOKEN || !CHAT_ID) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID ausentes — mensagem não enviada.');
    return null;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API error: ${data.description}`);
  return data;
}

// CLI — só roda quando o arquivo é o ponto de entrada
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const [,, ...messageParts] = process.argv;
  if (messageParts.length > 0) {
    sendMessage(messageParts.join(' ')).then(
      (r) => console.log(r ? 'Message sent.' : 'Não enviado (sem credenciais).'),
      (err) => { console.error('Error:', err.message); process.exit(1); }
    );
  } else {
    console.error('Uso: node scripts/telegram.mjs "mensagem"');
    process.exit(1);
  }
}
