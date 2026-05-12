// Google Analytics 4 wrapper — no-ops se o gtag não estiver carregado
export function trackEvent(name, params = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
