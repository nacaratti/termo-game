import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getModeByPath, GAME_MODES } from '@/config/gameModes';
import { initErrorReporter } from '@/lib/errorReporter';
import '@/index.css';

// Captura erros de runtime do navegador e envia para o Supabase
// (ver src/lib/errorReporter.js). Os agentes leem isso para criar
// cards de bug sem depender de comentário de usuário.
initErrorReporter();

// Injeta canonical URL e hreflang corretos para cada rota, evitando
// que o Google indexe versões duplicadas (trailing slash, www vs non-www).
(function applyCanonicalMeta() {
  const BASE = (import.meta.env.VITE_PUBLIC_URL || 'https://kinto.fun').replace(/\/$/, '');
  const cleanPath = window.location.pathname.replace(/\/$/, '') || '/';

  if (cleanPath.endsWith('/admin')) {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    return;
  }

  const url = BASE + (cleanPath === '/' ? '/' : cleanPath);

  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = url;
  document.head.appendChild(canonical);

  const altPt = document.createElement('link');
  altPt.rel = 'alternate';
  altPt.setAttribute('hreflang', 'pt-BR');
  altPt.href = url;
  document.head.appendChild(altPt);

  // x-default aponta para a página principal do jogo
  const altDefault = document.createElement('link');
  altDefault.rel = 'alternate';
  altDefault.setAttribute('hreflang', 'x-default');
  altDefault.href = BASE + '/';
  document.head.appendChild(altDefault);
})();

const AdminApp = lazy(() => import('@/AdminApp'));
const ChangelogApp = lazy(() => import('@/ChangelogApp'));
const CommentsApp = lazy(() => import('@/CommentsApp'));
const DonationApp = lazy(() => import('@/DonationApp'));

const path = window.location.pathname.replace(/\/$/, '');
const isAdmin = path.endsWith('/admin');
const isChangelog = path === '/changelog';
const isComments = path === '/comments';
const isDonation = path === '/apoie';
const initialMode = getModeByPath(path);

const AdminFallback = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16181d' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #3f4253', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isAdmin
        ? <Suspense fallback={<AdminFallback />}><AdminApp /></Suspense>
        : isChangelog
        ? <Suspense fallback={<AdminFallback />}><ChangelogApp /></Suspense>
        : isComments
        ? <Suspense fallback={<AdminFallback />}><CommentsApp /></Suspense>
        : isDonation
        ? <Suspense fallback={<AdminFallback />}><DonationApp /></Suspense>
        : <App initialMode={initialMode} allModes={GAME_MODES} />}
    </ErrorBoundary>
  </React.StrictMode>
);
