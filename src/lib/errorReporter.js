// ============================================================
// Reporter de erros de runtime do navegador.
// Captura window.onerror e unhandledrejection e grava em
// client_errors (Supabase, anon key — só INSERT permitido).
//
// Throttle: máximo MAX_PER_SESSION erros por carregamento de
// página, com dedupe por mensagem, para não inundar o banco.
//
// NÃO confundir com o handler de erro em vite.config.js, que é
// só para o overlay de desenvolvimento — esse aqui é produção.
// ============================================================
import { supabase } from '@/lib/supabase';

const MAX_PER_SESSION = 5;
const STACK_LIMIT = 2000;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

let sentCount = 0;
const seenMessages = new Set();

async function report(message, stack) {
  if (!supabase) return;
  if (!message) return;
  if (sentCount >= MAX_PER_SESSION) return;

  // Dedupe: mesma mensagem só é enviada uma vez por sessão
  const key = String(message).slice(0, 200);
  if (seenMessages.has(key)) return;
  seenMessages.add(key);
  sentCount += 1;

  try {
    await supabase.from('client_errors').insert({
      message: String(message).slice(0, 500),
      stack: stack ? String(stack).slice(0, STACK_LIMIT) : null,
      url: typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      app_version: APP_VERSION,
    });
  } catch {
    // Falha ao reportar erro nunca deve quebrar a aplicação — silencioso.
  }
}

let installed = false;

/** Instala os listeners globais de erro. Idempotente. */
export function initErrorReporter() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    // event.error tem stack; event.message é o texto
    report(event.message || event.error?.message, event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason);
    report(`Unhandled rejection: ${message}`, reason?.stack);
  });
}
