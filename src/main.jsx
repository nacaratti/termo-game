import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { getModeByPath, GAME_MODES } from '@/config/gameModes';
import { initErrorReporter } from '@/lib/errorReporter';
import '@/index.css';

// Captura erros de runtime do navegador e envia para o Supabase
// (ver src/lib/errorReporter.js). Os agentes leem isso para criar
// cards de bug sem depender de comentário de usuário.
initErrorReporter();

const AdminApp = lazy(() => import('@/AdminApp'));
const ChangelogApp = lazy(() => import('@/ChangelogApp'));
const CommentsApp = lazy(() => import('@/CommentsApp'));

const path = window.location.pathname.replace(/\/$/, '');
const isAdmin = path.endsWith('/admin');
const isChangelog = path === '/changelog';
const isComments = path === '/comments';
const initialMode = getModeByPath(path);

const AdminFallback = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16181d' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #3f4253', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin
      ? <Suspense fallback={<AdminFallback />}><AdminApp /></Suspense>
      : isChangelog
      ? <Suspense fallback={<AdminFallback />}><ChangelogApp /></Suspense>
      : isComments
      ? <Suspense fallback={<AdminFallback />}><CommentsApp /></Suspense>
      : <App initialMode={initialMode} allModes={GAME_MODES} />}
  </React.StrictMode>
);
