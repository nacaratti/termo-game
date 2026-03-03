import { supabase } from '@/lib/supabase';

// Chaves internas — propositalmente não descritivas
const STATS_KEY = '_s1z';
const DAILY_KEY = '_s2z';

const defaultStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  totalAttempts: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

const _readStats = () => {
  try { return JSON.parse(atob(localStorage.getItem(STATS_KEY) || '')); } catch { return null; }
};
const _writeStats = (data) => {
  try { localStorage.setItem(STATS_KEY, btoa(JSON.stringify(data))); } catch { /* ignore */ }
};

const _readDaily = () => {
  try { return JSON.parse(atob(localStorage.getItem(DAILY_KEY) || '')); } catch { return {}; }
};
const _writeDaily = (data) => {
  try { localStorage.setItem(DAILY_KEY, btoa(JSON.stringify(data))); } catch { /* ignore */ }
};

export const getStats = () => {
  const parsed = _readStats();
  if (!parsed) return { ...defaultStats, distribution: { ...defaultStats.distribution } };
  return { ...defaultStats, ...parsed, distribution: { ...defaultStats.distribution, ...parsed.distribution } };
};

export const saveGameResult = (won, attempts) => {
  const stats = getStats();
  stats.totalGames += 1;
  stats.totalAttempts += attempts;
  if (won) {
    stats.wins += 1;
    stats.distribution[attempts] = (stats.distribution[attempts] || 0) + 1;
  } else {
    stats.losses += 1;
  }
  _writeStats(stats);
};

export const resetStats = () => {
  localStorage.removeItem(STATS_KEY);
};

// Cache em memória para getDailyResults — evita múltiplas queries ao abrir/fechar o popup
const _resultsCache = new Map(); // key: `${dateStr}|${word}` → { data, ts }
const _CACHE_TTL = 60_000; // 60 segundos

// ─── Per-word results (global via Supabase, local como fallback) ──────────────

/**
 * Salva o resultado associado à palavra específica — não apenas à data.
 * Se admin trocar a palavra no mesmo dia, cada palavra acumula seus próprios resultados.
 */
export const saveDailyResult = async (dateStr, word, won, attempts) => {
  const upperWord = word.toUpperCase();

  // Salva localmente com chave (date|word) para separar palavras do mesmo dia
  const all = _readDaily();
  const key = `${dateStr}|${upperWord}`;
  if (!all[key]) all[key] = [];
  all[key].push({ won, attempts });
  _writeDaily(all);

  // Salva no Supabase com a coluna word
  if (supabase) {
    try {
      await supabase.from('daily_results').insert({ date: dateStr, word: upperWord, won, attempts });
    } catch { /* ignora erros de rede silenciosamente */ }
  }
};

/**
 * Retorna estatísticas globais de todos os jogos.
 */
export const getGlobalStats = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_results')
        .select('won, attempts');
      if (!error && data) {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        let totalAttempts = 0;
        let wins = 0;
        for (const r of data) {
          totalAttempts += r.attempts;
          if (r.won) {
            wins++;
            if (r.attempts >= 1 && r.attempts <= 6) distribution[r.attempts]++;
          }
        }
        return {
          totalGames: data.length,
          wins,
          losses: data.length - wins,
          totalAttempts,
          distribution,
        };
      }
    } catch { /* fallback */ }
  }
  return getStats();
};

/**
 * Salva a palavra do dia na tabela daily_words (upsert).
 */
export const saveDailyWord = async (dateStr, word) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('daily_words')
    .upsert({ date: dateStr, word: word.toUpperCase() });
  if (error) {
    if (import.meta.env.DEV) console.error('[Supabase] saveDailyWord:', error);
    throw error;
  }
};

/**
 * Retorna o histórico agrupado por (date, word).
 * Se a palavra mudar no mesmo dia, aparecem como entradas separadas no histórico.
 */
export const getHistoricalData = async () => {
  if (!supabase) return [];
  try {
    const resultsRes = await supabase.from('daily_results').select('date, word, won, attempts');
    const results = resultsRes.data || [];
    if (results.length === 0) return [];

    // Agrupa por (date, word) — palavras diferentes no mesmo dia ficam separadas.
    // Registros sem word (pré-migração) usam o cálculo determinístico — nunca a
    // palavra atual de daily_words, pois ela já pode ter sido trocada pelo admin.
    const byKey = {};
    for (const r of results) {
      // Registros anteriores à migração (sem coluna word) são agrupados como desconhecidos
      const word = r.word ? r.word.toUpperCase() : '?????';
      const key = `${r.date}|${word}`;
      if (!byKey[key]) byKey[key] = { date: r.date, word, rows: [] };
      byKey[key].rows.push(r);
    }

    return Object.values(byKey)
      .map(({ date, word, rows }) => {
        const wins = rows.filter(r => r.won).length;
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const r of rows) {
          if (r.won && r.attempts >= 1 && r.attempts <= 6) dist[r.attempts]++;
        }
        return {
          date,
          word,
          totalGames: rows.length,
          wins,
          losses: rows.length - wins,
          distribution: dist,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.word.localeCompare(a.word));
  } catch {
    return [];
  }
};

/**
 * Busca os resultados de uma palavra específica.
 * Filtra por (date, word) para não misturar resultados de palavras diferentes do mesmo dia.
 */
export const getDailyResults = async (dateStr, word) => {
  const upperWord = word?.toUpperCase();
  const cacheKey = `${dateStr}|${upperWord ?? ''}`;

  // Cache em memória (60s) — evita queries repetidas ao abrir/fechar o popup
  const cached = _resultsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < _CACHE_TTL) return cached.data;

  // Cache local (localStorage)
  const all = _readDaily();
  let localResults = (upperWord && all[`${dateStr}|${upperWord}`]) || all[dateStr] || [];

  if (supabase) {
    try {
      let query = supabase
        .from('daily_results')
        .select('won, attempts')
        .eq('date', dateStr);
      if (upperWord) query = query.eq('word', upperWord);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        _resultsCache.set(cacheKey, { data, ts: Date.now() });
        return data;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Supabase] getDailyResults:', err);
    }
  }

  _resultsCache.set(cacheKey, { data: localResults, ts: Date.now() });
  return localResults;
};
