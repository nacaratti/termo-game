import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// AdminApp carregado em chunk separado — só quando a rota /admin é acessada.
// Isso mantém SOLUTION_WORDS (lista de soluções) fora do bundle principal do jogo.
const AdminApp = lazy(() => import('@/AdminApp'));

const path = window.location.pathname.replace(/\/$/, '');
const isAdmin = path.endsWith('/admin');
const is6Letter = path === '/6';

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
      : is6Letter
        ? <App wordLength={6} maxGuesses={7} showChallenge={false} />
        : <App />}
  </React.StrictMode>
);
