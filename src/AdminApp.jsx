import React, { useState, useEffect, useMemo } from 'react';
import { SOLUTION_WORDS, VALID_WORDS_SET } from '@/data/wordList';
import { getGlobalStats, getDailyResults, saveDailyWord, getHistoricalData } from '@/lib/stats';
import { getCustomWords, addCustomWord, removeCustomWord } from '@/lib/customWords';
import { getWordOfDay, setWordOfDay, getTodayDateStr } from '@/lib/wordOfDay';

const ADMIN_PASSWORD = 'termo@admin';
const AUTH_KEY = 'termo_admin_auth';
const PAGE_SIZE = 50;

// ─── Primitivos de UI ─────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-4">{children}</p>
);

const Input = ({ className = '', ...props }) => (
  <input
    className={`bg-zinc-800 border border-zinc-700 focus:border-zinc-400 rounded-lg px-4 py-2.5 text-white outline-none transition-colors placeholder:text-zinc-600 ${className}`}
    {...props}
  />
);

const BtnPrimary = ({ children, className = '', ...props }) => (
  <button
    className={`bg-white hover:bg-zinc-100 text-black font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);

const BtnGhost = ({ children, className = '', ...props }) => (
  <button
    className={`border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg transition-colors text-sm ${className}`}
    {...props}
  >
    {children}
  </button>
);

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
    <div className="min-h-dvh flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase">Penta</h1>
          <p className="text-zinc-600 text-sm mt-1">Painel Admin</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Senha"
              autoFocus
              className="w-full"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <BtnPrimary type="submit" className="py-2.5">Entrar</BtnPrimary>
          </form>
        </Card>
        <p className="text-zinc-700 text-xs text-center mt-5">
          <a href="/" className="hover:text-zinc-400 transition-colors">← Voltar ao jogo</a>
        </p>
      </div>
    </div>
  );
};

// ─── Barra de distribuição ────────────────────────────────────────────────────
const DistBar = ({ label, count, maxVal, highlight = false, danger = false }) => {
  const pct = Math.round((count / Math.max(maxVal, 1)) * 100);
  const barColor = danger ? 'bg-zinc-500' : highlight ? 'bg-white' : 'bg-[#538d4e]';
  const textColor = highlight || danger ? 'text-black' : 'text-white';
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-zinc-600 w-4 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-sm h-5 overflow-hidden">
        <div
          className={`h-5 rounded-sm flex items-center justify-end pr-2 transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
        >
          {count > 0 && <span className={`text-xs font-bold ${textColor}`}>{count}</span>}
        </div>
      </div>
      <span className="text-zinc-700 w-5 text-right shrink-0">{count}</span>
    </div>
  );
};

// ─── Palavra do Dia ───────────────────────────────────────────────────────────
const WordOfDayPanel = () => {
  const today = getTodayDateStr();
  const [currentWord, setCurrentWord] = useState(() => getWordOfDay());
  const [newWord, setNewWord] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailyResults(today).then(data => { setResults(data); setLoading(false); });
  }, [today]);

  const wins = results.filter(r => r.won).length;
  const losses = results.filter(r => !r.won).length;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 };
  for (const r of results) {
    if (r.won) dist[r.attempts] = (dist[r.attempts] || 0) + 1;
    else dist.X++;
  }
  const maxDist = Math.max(...Object.values(dist), 1);

  const handleChange = (e) => {
    e.preventDefault();
    const upper = newWord.toUpperCase().trim();
    if (upper.length !== 5) return setFeedback({ type: 'error', msg: 'A palavra deve ter exatamente 5 letras.' });
    if (!/^[A-Z]+$/.test(upper)) return setFeedback({ type: 'error', msg: 'Use apenas letras sem acentos.' });
    setWordOfDay(upper);
    setCurrentWord(upper);
    setNewWord('');
    saveDailyWord(today, upper);
    setFeedback({ type: 'ok', msg: `Palavra alterada para "${upper}". Recarregue o jogo para aplicar.` });
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Palavra atual */}
      <Card>
        <SectionTitle>Palavra do dia — {today}</SectionTitle>
        <p className="font-mono text-5xl font-black text-white tracking-[0.35em] mb-5">
          {currentWord}
        </p>
        <form onSubmit={handleChange} className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            maxLength={5}
            placeholder="Nova palavra"
            className="flex-1 font-mono text-lg tracking-widest uppercase"
          />
          <BtnPrimary type="submit" disabled={newWord.length !== 5} className="px-5 py-2 whitespace-nowrap">
            Alterar
          </BtnPrimary>
        </form>
        {feedback && (
          <p className={`mt-3 text-sm ${feedback.type === 'ok' ? 'text-[#538d4e]' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </Card>

      {/* Resultados do dia */}
      <Card>
        <SectionTitle>
          Resultados de hoje · {loading ? '…' : `${results.length} ${results.length === 1 ? 'jogo' : 'jogos'}`}
        </SectionTitle>

        {loading ? (
          <p className="text-zinc-700 text-sm text-center py-4">Carregando…</p>
        ) : results.length === 0 ? (
          <p className="text-zinc-700 text-sm text-center py-4">Nenhum jogo registrado hoje.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Jogos', value: results.length, color: 'text-white' },
                { label: 'Vitórias', value: wins, color: 'text-[#538d4e]' },
                { label: 'Derrotas', value: losses, color: 'text-zinc-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-zinc-600 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <DistBar key={n} label={n} count={dist[n] || 0} maxVal={maxDist} />
              ))}
              {dist.X > 0 && <DistBar label="✗" count={dist.X} maxVal={maxDist} danger />}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

// ─── Estatísticas globais ─────────────────────────────────────────────────────
const StatsPanel = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getGlobalStats().then(setStats);
  }, []);

  if (!stats) {
    return <p className="text-zinc-700 text-sm text-center py-8">Carregando…</p>;
  }

  const avgAttempts = stats.wins > 0
    ? (stats.totalAttempts / stats.totalGames).toFixed(1)
    : '–';
  const maxDist = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de jogos', value: stats.totalGames, color: 'text-white' },
          { label: 'Vitórias', value: stats.wins, color: 'text-[#538d4e]' },
          { label: 'Derrotas', value: stats.losses, color: 'text-zinc-400' },
          { label: 'Média tentativas', value: avgAttempts, color: 'text-[#b59f3b]' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center !py-4">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-zinc-600 text-xs mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle>Distribuição de tentativas — todos os jogos</SectionTitle>
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <DistBar key={n} label={n} count={stats.distribution[n] || 0} maxVal={maxDist} />
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── Palavras ─────────────────────────────────────────────────────────────────
const WordsPanel = () => {
  const [customWords, setCustomWords] = useState(getCustomWords());
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const solSet = useMemo(() => new Set(SOLUTION_WORDS), []);

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

  useEffect(() => { setPage(0); }, [search, showAll]);

  const handleAdd = (e) => {
    e.preventDefault();
    const result = addCustomWord(newWord);
    if (result.ok) {
      setCustomWords(getCustomWords());
      setNewWord('');
      setFeedback({ type: 'ok', msg: `"${newWord.toUpperCase()}" adicionada!` });
    } else {
      setFeedback({ type: 'error', msg: result.reason });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const sourceLabel = {
    solucao:      { text: 'Solução',      cls: 'border-[#538d4e]/50 text-[#538d4e]' },
    extra:        { text: 'Extra',        cls: 'border-zinc-700 text-zinc-500' },
    personalizada:{ text: 'Personalizada',cls: 'border-white/20 text-white' },
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Adicionar palavra</SectionTitle>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            maxLength={5}
            placeholder="5 letras"
            className="flex-1 font-mono text-lg tracking-widest uppercase"
          />
          <BtnPrimary type="submit" disabled={newWord.length !== 5} className="px-5 py-2">
            Adicionar
          </BtnPrimary>
        </form>
        {feedback && (
          <p className={`mt-3 text-sm ${feedback.type === 'ok' ? 'text-[#538d4e]' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar palavra…"
            className="flex-1"
          />
          <BtnGhost
            onClick={() => setShowAll(v => !v)}
            className="px-4 py-2 whitespace-nowrap"
          >
            {showAll ? 'Só personalizadas' : `Ver todas (${allWords.length})`}
          </BtnGhost>
        </div>

        <p className="text-zinc-700 text-xs mb-3">
          {search || showAll
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length}`
            : `${customWords.length} palavra(s) personalizada(s)`}
        </p>

        {paginated.length === 0 ? (
          <p className="text-zinc-700 text-sm text-center py-6">Nenhuma palavra encontrada.</p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {paginated.map(({ word, source }) => (
              <div key={word} className="flex items-center justify-between py-2.5 gap-3">
                <span className="font-mono text-white font-semibold tracking-widest text-sm">{word}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${sourceLabel[source].cls}`}>
                    {sourceLabel[source].text}
                  </span>
                  {source === 'personalizada' && (
                    <button
                      onClick={() => { removeCustomWord(word); setCustomWords(getCustomWords()); }}
                      className="text-zinc-600 hover:text-red-400 text-xs border border-zinc-800 hover:border-red-900 px-2 py-0.5 rounded transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
            <BtnGhost onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 disabled:opacity-30">
              ← Anterior
            </BtnGhost>
            <span className="text-zinc-700 text-xs">{page + 1} / {totalPages}</span>
            <BtnGhost onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 disabled:opacity-30">
              Próxima →
            </BtnGhost>
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Histórico ────────────────────────────────────────────────────────────────
const HistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistoricalData().then(data => { setHistory(data); setLoading(false); });
  }, []);

  if (loading) return <p className="text-zinc-700 text-sm text-center py-8">Carregando…</p>;
  if (history.length === 0) return <p className="text-zinc-700 text-sm text-center py-8">Nenhum dado histórico disponível.</p>;

  return (
    <div className="space-y-3">
      {history.map(({ date, word, totalGames, wins, losses, distribution }) => {
        const maxDist = Math.max(...Object.values(distribution), 1);
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        return (
          <Card key={date}>
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-zinc-600 text-xs mb-0.5">{date}</p>
                <p className="font-mono text-3xl font-black text-white tracking-[0.3em]">{word}</p>
              </div>
              <div className="flex gap-4 text-center shrink-0">
                <div>
                  <p className="text-2xl font-black text-white">{totalGames}</p>
                  <p className="text-zinc-600 text-xs">jogos</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#538d4e]">{wins}</p>
                  <p className="text-zinc-600 text-xs">acertos</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-zinc-500">{losses}</p>
                  <p className="text-zinc-600 text-xs">erros</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#b59f3b]">{winRate}%</p>
                  <p className="text-zinc-600 text-xs">taxa</p>
                </div>
              </div>
            </div>

            {/* Distribuição de tentativas */}
            {wins > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-700 mb-2">Distribuição de tentativas</p>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <DistBar key={n} label={n} count={distribution[n] || 0} maxVal={maxDist} />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'wod',     label: 'Palavra do Dia' },
  { id: 'stats',   label: 'Estatísticas'   },
  { id: 'history', label: 'Histórico'      },
  { id: 'words',   label: 'Palavras'       },
];

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('wod');

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <header className="border-b border-zinc-900 sticky top-0 z-10 bg-black">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-black tracking-[0.3em] text-white text-lg uppercase">Penta</h1>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-zinc-600 hover:text-white transition-colors">← Jogo</a>
            <button
              onClick={onLogout}
              className="text-xs border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 py-6 flex-1">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'wod'     && <WordOfDayPanel />}
        {activeTab === 'stats'   && <StatsPanel />}
        {activeTab === 'history' && <HistoryPanel />}
        {activeTab === 'words'   && <WordsPanel />}
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
