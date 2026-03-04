import React, { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SOLUTION_WORDS } from '@/data/solutionList';
import { VALID_WORDS_SET } from '@/data/wordList';
import { getGlobalStats, getDailyResults, saveDailyWord, getHistoricalData } from '@/lib/stats';
import { getCustomWords, addCustomWord, removeCustomWord } from '@/lib/customWords';
import { getWordOfDay, setWordOfDay, getTodayDateStr } from '@/lib/wordOfDay';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 50;

// Paleta do admin — espelha o jogo
const BG   = '#16181d';
const CARD = '#1e2028';
const SURF = '#22252f';
const BDR  = '#2c2f3a';
const BDR2 = '#363a47';

// ─── Primitivos de UI ─────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-xl p-4 sm:p-5 border ${className}`}
    style={{ backgroundColor: CARD, borderColor: BDR }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">{children}</p>
);

const Input = ({ className = '', ...props }) => (
  <input
    className={`rounded-lg px-4 py-2.5 text-white outline-none transition-colors placeholder:text-zinc-600 border ${className}`}
    style={{ backgroundColor: SURF, borderColor: BDR2 }}
    onFocus={e => (e.target.style.borderColor = '#7a7d8e')}
    onBlur={e  => (e.target.style.borderColor = BDR2)}
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
    className={`text-zinc-400 hover:text-white rounded-lg transition-colors text-sm border ${className}`}
    style={{ borderColor: BDR2 }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = '#4a4d5e')}
    onMouseLeave={e => (e.currentTarget.style.borderColor = BDR2)}
    {...props}
  >
    {children}
  </button>
);

// ─── Login ────────────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase não configurado.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError('Email ou senha incorretos.');
      setPassword('');
    } else {
      onLogin();
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase">Kinto</h1>
          <p className="text-zinc-500 text-sm mt-1">Painel Admin</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              id="admin-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="Email"
              autoFocus
              disabled={loading}
              className="w-full"
            />
            <Input
              id="admin-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Senha"
              disabled={loading}
              className="w-full"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <BtnPrimary type="submit" disabled={loading} className="py-2.5">
              {loading ? 'Entrando…' : 'Entrar'}
            </BtnPrimary>
          </form>
        </Card>
        <p className="text-zinc-700 text-xs text-center mt-5">
          <a href="/" className="hover:text-zinc-400 transition-colors">← Voltar ao jogo</a>
        </p>
      </div>
    </div>
  );
};

// Célula de estatística — fundo colorido no mobile, sem fundo no desktop
const StatCell = ({ value, label, color }) => {
  const isMobile = useIsMobile();
  return (
    <div
      className="rounded-lg p-2 sm:p-0 text-center"
      style={{ backgroundColor: isMobile ? SURF : 'transparent' }}
    >
      <p className={`text-lg sm:text-2xl font-black ${color}`}>{value}</p>
      <p className="text-zinc-500 text-xs">{label}</p>
    </div>
  );
};

// ─── Barra de distribuição ────────────────────────────────────────────────────
const DistBar = ({ label, count, maxVal, highlight = false, danger = false }) => {
  const pct = Math.round((count / Math.max(maxVal, 1)) * 100);
  const barColor = danger ? '#4a4d5e' : highlight ? '#ffffff' : '#6aaa64';
  const textColor = highlight || danger ? '#000' : '#fff';
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-zinc-500 w-4 text-right shrink-0">{label}</span>
      <div className="flex-1 rounded-sm h-5 overflow-hidden" style={{ backgroundColor: SURF }}>
        <div
          className="h-5 rounded-sm flex items-center justify-end pr-2 transition-all duration-500"
          style={{
            width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
            backgroundColor: barColor,
          }}
        >
          {count > 0 && <span className="text-xs font-bold" style={{ color: textColor }}>{count}</span>}
        </div>
      </div>
      <span className="text-zinc-600 w-5 text-right shrink-0">{count}</span>
    </div>
  );
};

// ─── Palavra do Dia ───────────────────────────────────────────────────────────
const WordOfDayPanel = () => {
  const today = getTodayDateStr();
  const [currentWord, setCurrentWord] = useState(() => getWordOfDay() || '—');
  const [newWord, setNewWord] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // { word } pendente de confirmação

  useEffect(() => {
    getDailyResults(today, currentWord).then(data => { setResults(data); setLoading(false); });
  }, [today, currentWord]);

  const wins = results.filter(r => r.won).length;
  const losses = results.filter(r => !r.won).length;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 };
  for (const r of results) {
    if (r.won) dist[r.attempts] = (dist[r.attempts] || 0) + 1;
    else dist.X++;
  }
  const maxDist = Math.max(...Object.values(dist), 1);

  const applyWord = async (word) => {
    setConfirm(null);
    setWordOfDay(word);
    setCurrentWord(word);
    setNewWord('');
    try {
      await saveDailyWord(today, word);
      setFeedback({ type: 'ok', msg: `Palavra "${word}" salva. Recarregue o jogo para aplicar.` });
    } catch {
      setFeedback({ type: 'error', msg: `Salvo localmente, mas falhou ao sincronizar. Verifique o Supabase.` });
    }
    setTimeout(() => setFeedback(null), 6000);
  };

  const requestChange = (word) => {
    // Se já há jogadores com a palavra atual, pede confirmação
    if (results.length > 0) {
      setConfirm({ word });
    } else {
      applyWord(word);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    const upper = newWord.toUpperCase().trim();
    if (upper.length !== 5) return setFeedback({ type: 'error', msg: 'A palavra deve ter exatamente 5 letras.' });
    requestChange(upper);
  };

  return (
    <div className="space-y-4">
      {/* Modal de confirmação */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 border" style={{ backgroundColor: CARD, borderColor: BDR }}>
            <p className="text-white font-bold text-base">Confirmar troca de palavra?</p>
            <p className="text-zinc-400 text-sm">
              <span className="text-[#c9a84c] font-semibold">{results.length} jogador{results.length !== 1 ? 'es' : ''}</span> já
              {results.length !== 1 ? ' jogaram' : ' jogou'} com <span className="font-mono text-white">{currentWord}</span>.
              Os resultados deles serão mantidos. A nova palavra será <span className="font-mono text-white">{confirm.word}</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-zinc-400 border transition-colors hover:text-white"
                style={{ borderColor: BDR2 }}
              >
                Cancelar
              </button>
              <BtnPrimary onClick={() => applyWord(confirm.word)} className="flex-1 py-2.5 text-sm">
                Confirmar
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      <Card>
        <SectionTitle>Palavra do dia — {today}</SectionTitle>
        <p className="font-mono text-4xl sm:text-5xl font-black text-white tracking-[0.3em] sm:tracking-[0.35em] mb-5">
          {currentWord}
        </p>
        <form onSubmit={handleChange} className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value.toUpperCase().replace(/[^A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ]/g, ''))}
            maxLength={5}
            placeholder="Nova palavra"
            className="flex-1 font-mono text-lg tracking-widest uppercase"
          />
          <BtnPrimary type="submit" disabled={newWord.length !== 5} className="px-5 py-2 whitespace-nowrap">
            Alterar
          </BtnPrimary>
        </form>

        {feedback && (
          <p className={`mt-3 text-sm ${feedback.type === 'ok' ? 'text-[#6aaa64]' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle>
          Resultados de hoje · {loading ? '…' : `${results.length} ${results.length === 1 ? 'jogo' : 'jogos'}`}
        </SectionTitle>

        {loading ? (
          <p className="text-zinc-600 text-sm text-center py-4">Carregando…</p>
        ) : results.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-4">Nenhum jogo registrado hoje.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Jogos',    value: results.length, color: 'text-white'     },
                { label: 'Vitórias', value: wins,           color: 'text-[#6aaa64]' },
                { label: 'Derrotas', value: losses,         color: 'text-zinc-400'  },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ backgroundColor: SURF }}>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-zinc-500 text-xs mt-1">{label}</p>
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

  if (!stats) return <p className="text-zinc-600 text-sm text-center py-8">Carregando…</p>;

  const avgAttempts = stats.wins > 0
    ? (stats.totalAttempts / stats.wins).toFixed(1)
    : '–';
  const maxDist = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de jogos',   value: stats.totalGames, color: 'text-white'     },
          { label: 'Vitórias',         value: stats.wins,       color: 'text-[#6aaa64]' },
          { label: 'Derrotas',         value: stats.losses,     color: 'text-zinc-400'  },
          { label: 'Média tentativas', value: avgAttempts,      color: 'text-[#c9a84c]' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center !py-4">
            <p className={`text-3xl font-black ${color}`}>{value}</p>
            <p className="text-zinc-500 text-xs mt-1">{label}</p>
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
    solucao:       { text: 'Solução',       cls: 'text-[#6aaa64]',  bdr: '#6aaa64' },
    extra:         { text: 'Extra',         cls: 'text-zinc-500',   bdr: BDR2      },
    personalizada: { text: 'Personalizada', cls: 'text-white',      bdr: '#5a5d70' },
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
          <p className={`mt-3 text-sm ${feedback.type === 'ok' ? 'text-[#6aaa64]' : 'text-red-400'}`}>
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

        <p className="text-zinc-600 text-xs mb-3">
          {search || showAll
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length}`
            : `${customWords.length} palavra(s) personalizada(s)`}
        </p>

        {paginated.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-6">Nenhuma palavra encontrada.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: BDR }}>
            {paginated.map(({ word, source }) => {
              const { text, cls, bdr } = sourceLabel[source];
              return (
                <div key={word} className="flex items-center justify-between py-2.5 gap-3" style={{ borderColor: BDR }}>
                  <span className="font-mono text-white font-semibold tracking-widest text-sm">{word}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${cls}`}
                      style={{ borderColor: bdr + '80' }}
                    >
                      {text}
                    </span>
                    {source === 'personalizada' && (
                      <button
                        onClick={() => { removeCustomWord(word); setCustomWords(getCustomWords()); }}
                        className="text-zinc-500 hover:text-red-400 text-xs border px-2 py-0.5 rounded transition-colors"
                        style={{ borderColor: BDR }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: BDR }}>
            <BtnGhost onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 disabled:opacity-30">
              ← Anterior
            </BtnGhost>
            <span className="text-zinc-600 text-xs">{page + 1} / {totalPages}</span>
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

  if (loading) return <p className="text-zinc-600 text-sm text-center py-8">Carregando…</p>;
  if (history.length === 0) return <p className="text-zinc-600 text-sm text-center py-8">Nenhum dado histórico disponível.</p>;

  return (
    <div className="space-y-3">
      {history.map(({ date, word, totalGames, wins, losses, distribution }) => {
        const maxDist = Math.max(...Object.values(distribution), 1);
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        return (
          <Card key={`${date}|${word}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">{date}</p>
                <p className="font-mono text-2xl sm:text-3xl font-black text-white tracking-[0.3em]">{word}</p>
              </div>
              <div className="grid grid-cols-4 sm:flex sm:gap-4 gap-2 text-center">
                {[
                  { value: totalGames,    label: 'jogos',   color: 'text-white'     },
                  { value: wins,          label: 'acertos', color: 'text-[#6aaa64]' },
                  { value: losses,        label: 'erros',   color: 'text-zinc-400'  },
                  { value: `${winRate}%`, label: 'taxa',    color: 'text-[#c9a84c]' },
                ].map(({ value, label, color }) => (
                  <StatCell key={label} value={value} label={label} color={color} />
                ))}
              </div>
            </div>

            {wins > 0 && (
              <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: BDR }}>
                <p className="text-xs text-zinc-600 mb-2">Distribuição de tentativas</p>
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
  { id: 'wod',     label: 'Palavra do Dia', short: 'Hoje'      },
  { id: 'stats',   label: 'Estatísticas',   short: 'Stats'     },
  { id: 'history', label: 'Histórico',      short: 'Histórico' },
  { id: 'words',   label: 'Palavras',       short: 'Palavras'  },
];

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('wod');

  return (
    <div className="min-h-dvh text-white flex flex-col" style={{ backgroundColor: BG }}>
      <header className="sticky top-0 z-10 border-b" style={{ backgroundColor: BG, borderColor: BDR }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-black tracking-[0.3em] text-white text-lg uppercase">Kinto</h1>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-zinc-500 hover:text-white transition-colors">← Jogo</a>
            <button
              onClick={onLogout}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors border"
              style={{ borderColor: BDR }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 py-6 flex-1 pb-24 sm:pb-6">
        {/* Tabs — visíveis apenas em telas maiores */}
        <div
          className="hidden sm:flex gap-1 mb-6 rounded-xl p-1 w-fit border"
          style={{ backgroundColor: CARD, borderColor: BDR }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
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

      {/* Navegação inferior — apenas mobile */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 border-t z-20 flex"
        style={{ backgroundColor: CARD, borderColor: BDR, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-t-2 ${
              activeTab === tab.id
                ? 'text-white border-white'
                : 'text-zinc-500 border-transparent'
            }`}
          >
            {tab.short}
          </button>
        ))}
      </nav>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const AdminApp = () => {
  // null = checking, false = unauthenticated, true = authenticated
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    if (!supabase) { setAuthenticated(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
    });
  }, []);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthenticated(false);
  };

  if (authenticated === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
      </div>
    );
  }

  if (!authenticated) return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  return <Dashboard onLogout={handleLogout} />;
};

export default AdminApp;
