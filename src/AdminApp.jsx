import React, { useState, useEffect, useMemo } from 'react';
import { SOLUTION_WORDS, VALID_WORDS_SET } from '@/data/wordList';
import { getStats, resetStats, getDailyResults } from '@/lib/stats';
import { getCustomWords, addCustomWord, removeCustomWord } from '@/lib/customWords';
import { getWordOfDay, setWordOfDay, getTodayDateStr } from '@/lib/wordOfDay';

// ─── Configuração ────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = 'termo@admin';
const AUTH_KEY = 'termo_admin_auth';
const PAGE_SIZE = 50;

// ─── Login ────────────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      onLogin();
    } else {
      setError('Senha incorreta.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-black to-emerald-900 p-4">
      <div className="w-full max-w-xs bg-slate-900 border border-primary/30 rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-extrabold text-primary mb-1 text-center">Painel Admin</h1>
        <p className="text-slate-500 text-sm text-center mb-6">Acesso restrito</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Senha"
            autoFocus
            className="w-full bg-slate-800 border border-slate-600 focus:border-primary rounded-lg px-4 py-2.5 text-white outline-none transition-colors"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-slate-900 font-bold py-2.5 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </form>
        <p className="text-slate-600 text-xs text-center mt-6">
          <a href="/" className="hover:text-slate-400 transition-colors">← Voltar ao jogo</a>
        </p>
      </div>
    </div>
  );
};

// ─── Word of the Day ─────────────────────────────────────────────────────────
const WordOfDayPanel = () => {
  const today = getTodayDateStr();
  const [currentWord, setCurrentWord] = useState(() => getWordOfDay());
  const [newWord, setNewWord] = useState('');
  const [feedback, setFeedback] = useState(null);

  const todayResults = getDailyResults(today);
  const wins = todayResults.filter(r => r.won).length;
  const losses = todayResults.filter(r => !r.won).length;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 };
  for (const r of todayResults) {
    if (r.won) distribution[r.attempts] = (distribution[r.attempts] || 0) + 1;
    else distribution.X = (distribution.X || 0) + 1;
  }
  const maxDist = Math.max(...Object.values(distribution), 1);

  const handleChange = (e) => {
    e.preventDefault();
    const upper = newWord.toUpperCase().trim();
    if (upper.length !== 5) {
      setFeedback({ type: 'error', msg: 'A palavra deve ter exatamente 5 letras.' });
      return;
    }
    if (!/^[A-Z]+$/.test(upper)) {
      setFeedback({ type: 'error', msg: 'Use apenas letras sem acentos.' });
      return;
    }
    setWordOfDay(upper);
    setCurrentWord(upper);
    setNewWord('');
    setFeedback({ type: 'ok', msg: `Palavra alterada para "${upper}". Recarregue o jogo para aplicar.` });
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Current word card */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Palavra do dia — {today}
        </h3>
        <p className="font-mono text-4xl font-extrabold text-primary tracking-[0.3em] mb-4">
          {currentWord}
        </p>
        <form onSubmit={handleChange} className="flex gap-2">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            maxLength={5}
            placeholder="Nova palavra (5 letras)"
            className="flex-1 bg-slate-700 border border-slate-600 focus:border-primary rounded-lg px-4 py-2 text-white font-mono text-lg tracking-widest outline-none transition-colors uppercase"
          />
          <button
            type="submit"
            disabled={newWord.length !== 5}
            className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Alterar
          </button>
        </form>
        {feedback && (
          <p className={`mt-2 text-sm ${feedback.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </div>

      {/* Today's results */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Resultados de hoje &middot; {todayResults.length} {todayResults.length === 1 ? 'jogo' : 'jogos'}
        </h3>
        {todayResults.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Nenhum jogo registrado hoje.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-extrabold text-primary">{todayResults.length}</p>
                <p className="text-slate-400 text-xs mt-1">Jogos</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-extrabold text-green-400">{wins}</p>
                <p className="text-slate-400 text-xs mt-1">Vitórias</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-2xl font-extrabold text-red-400">{losses}</p>
                <p className="text-slate-400 text-xs mt-1">Derrotas</p>
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map(n => {
                const count = distribution[n] || 0;
                const pct = Math.round((count / maxDist) * 100);
                return (
                  <div key={n} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400 w-4 text-right shrink-0">{n}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-5 bg-green-600 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                      >
                        {count > 0 && <span className="text-xs font-bold text-white">{count}</span>}
                      </div>
                    </div>
                    <span className="text-slate-500 w-6 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
              {distribution.X > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-red-400 w-4 text-right shrink-0">✗</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 bg-red-700 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(Math.round((distribution.X / maxDist) * 100), 8)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{distribution.X}</span>
                    </div>
                  </div>
                  <span className="text-slate-500 w-6 text-right shrink-0">{distribution.X}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Stats ────────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = 'text-primary' }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
    <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
    <p className="text-slate-400 text-sm mt-1">{label}</p>
  </div>
);

const StatsPanel = () => {
  const [stats, setStats] = useState(getStats());

  const avgAttempts = stats.wins > 0
    ? (stats.totalAttempts / stats.totalGames).toFixed(1)
    : '–';

  const maxDist = Math.max(...Object.values(stats.distribution), 1);

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja apagar todas as estatísticas?')) {
      resetStats();
      setStats(getStats());
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total de jogos" value={stats.totalGames} />
        <StatCard label="Vitórias" value={stats.wins} color="text-green-400" />
        <StatCard label="Derrotas" value={stats.losses} color="text-red-400" />
        <StatCard label="Média de tentativas" value={avgAttempts} color="text-yellow-400" />
      </div>

      {/* Distribuição */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">
          Distribuição de tentativas
        </h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const count = stats.distribution[n] || 0;
            const pct = Math.round((count / maxDist) * 100);
            return (
              <div key={n} className="flex items-center gap-3 text-sm">
                <span className="text-slate-400 w-4 text-right">{n}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-5 bg-primary rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                  >
                    {count > 0 && <span className="text-xs font-bold text-slate-900">{count}</span>}
                  </div>
                </div>
                <span className="text-slate-500 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleReset}
        className="text-sm text-red-500 hover:text-red-400 border border-red-800 hover:border-red-600 px-4 py-2 rounded-lg transition-colors"
      >
        Apagar estatísticas
      </button>
    </div>
  );
};

// ─── Words ────────────────────────────────────────────────────────────────────
const WordsPanel = () => {
  const [customWords, setCustomWords] = useState(getCustomWords());
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'ok'|'error', msg }
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const solSet = useMemo(() => new Set(SOLUTION_WORDS), []);

  // Combina todas as palavras com sua origem
  const allWords = useMemo(() => {
    const words = [];
    for (const w of SOLUTION_WORDS) words.push({ word: w, source: 'solucao' });
    for (const w of VALID_WORDS_SET) {
      if (!solSet.has(w) && !customWords.includes(w)) words.push({ word: w, source: 'extra' });
    }
    for (const w of customWords) words.push({ word: w, source: 'personalizada' });
    return words.sort((a, b) => a.word.localeCompare(b.word));
  }, [customWords, solSet]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q && !showAll) return allWords.filter(e => e.source === 'personalizada');
    return q ? allWords.filter(e => e.word.includes(q)) : allWords;
  }, [allWords, search, showAll]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset página ao filtrar
  useEffect(() => { setPage(0); }, [search, showAll]);

  const handleAdd = (e) => {
    e.preventDefault();
    const result = addCustomWord(newWord);
    if (result.ok) {
      setCustomWords(getCustomWords());
      setNewWord('');
      setFeedback({ type: 'ok', msg: `"${newWord.toUpperCase()}" adicionada com sucesso!` });
    } else {
      setFeedback({ type: 'error', msg: result.reason });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemove = (word) => {
    removeCustomWord(word);
    setCustomWords(getCustomWords());
  };

  const sourceLabel = {
    solucao: { text: 'Solução', cls: 'bg-green-900/50 text-green-300 border-green-700' },
    extra: { text: 'Extra', cls: 'bg-slate-700 text-slate-300 border-slate-600' },
    personalizada: { text: 'Personalizada', cls: 'bg-primary/20 text-primary border-primary/40' },
  };

  return (
    <div className="space-y-5">
      {/* Adicionar palavra */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-3">
          Adicionar palavra
        </h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            maxLength={5}
            placeholder="5 letras"
            className="flex-1 bg-slate-700 border border-slate-600 focus:border-primary rounded-lg px-4 py-2 text-white font-mono text-lg tracking-widest outline-none transition-colors uppercase"
          />
          <button
            type="submit"
            disabled={newWord.length !== 5}
            className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold px-5 py-2 rounded-lg transition-colors"
          >
            Adicionar
          </button>
        </form>
        {feedback && (
          <p className={`mt-2 text-sm ${feedback.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </div>

      {/* Busca e listagem */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar palavra..."
            className="flex-1 bg-slate-700 border border-slate-600 focus:border-primary rounded-lg px-4 py-2 text-white outline-none transition-colors"
          />
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-sm border border-slate-600 hover:border-primary text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {showAll ? 'Só personalizadas' : `Ver todas (${allWords.length})`}
          </button>
        </div>

        <p className="text-slate-500 text-xs mb-3">
          {search || showAll
            ? `Mostrando ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length} palavras`
            : `${customWords.length} palavra(s) personalizada(s)`}
        </p>

        {paginated.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">Nenhuma palavra encontrada.</p>
        ) : (
          <div className="divide-y divide-slate-700">
            {paginated.map(({ word, source }) => (
              <div key={word} className="flex items-center justify-between py-2 gap-3">
                <span className="font-mono text-white font-semibold tracking-widest">{word}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${sourceLabel[source].cls}`}>
                    {sourceLabel[source].text}
                  </span>
                  {source === 'personalizada' && (
                    <button
                      onClick={() => handleRemove(word)}
                      className="text-red-500 hover:text-red-400 text-xs border border-red-800 hover:border-red-600 px-2 py-0.5 rounded transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-sm text-slate-300 hover:text-white disabled:opacity-30 border border-slate-600 px-3 py-1 rounded transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-slate-500 text-sm">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-sm text-slate-300 hover:text-white disabled:opacity-30 border border-slate-600 px-3 py-1 rounded transition-colors"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'wod', label: 'Palavra do Dia' },
  { id: 'stats', label: 'Estatísticas' },
  { id: 'words', label: 'Palavras' },
];

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('wod');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-emerald-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-primary text-lg leading-none">Painel Admin</h1>
            <p className="text-slate-500 text-xs">Qual é a Palavra?</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
              ← Jogo
            </a>
            <button
              onClick={onLogout}
              className="text-xs border border-slate-600 hover:border-red-700 text-slate-300 hover:text-red-400 px-3 py-1.5 rounded transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-800/60 rounded-lg p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'wod' && <WordOfDayPanel />}
        {activeTab === 'stats' && <StatsPanel />}
        {activeTab === 'words' && <WordsPanel />}
      </main>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const AdminApp = () => {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === '1'
  );

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  return <Dashboard onLogout={handleLogout} />;
};

export default AdminApp;
