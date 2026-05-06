import { supabase } from '@/lib/supabase';

const DAILY_KEY = '_s2z6';

const _readDaily = () => {
  try { return JSON.parse(atob(localStorage.getItem(DAILY_KEY) || '')); } catch { return {}; }
};
const _writeDaily = (data) => {
  try { localStorage.setItem(DAILY_KEY, btoa(JSON.stringify(data))); } catch {}
};

const _resultsCache = new Map();
const _CACHE_TTL = 60_000;

export const saveDailyWord6 = async (dateStr, word) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('daily_words_6')
    .upsert({ date: dateStr, word: word.toUpperCase() });
  if (error) {
    if (import.meta.env.DEV) console.error('[Supabase] saveDailyWord6:', error);
    throw error;
  }
};

export const getGlobalStats6 = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_results_6')
        .select('won, attempts');
      if (!error && data) {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
        let totalAttempts = 0;
        let wins = 0;
        for (const r of data) {
          totalAttempts += r.attempts;
          if (r.won) {
            wins++;
            if (r.attempts >= 1 && r.attempts <= 7) distribution[r.attempts]++;
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
    } catch {}
  }
  // Fallback: agrega dados do localStorage
  const all = _readDaily();
  const rows = Object.values(all).flat();
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  let wins = 0;
  let totalAttempts = 0;
  for (const r of rows) {
    totalAttempts += r.attempts;
    if (r.won) { wins++; if (r.attempts >= 1 && r.attempts <= 7) distribution[r.attempts]++; }
  }
  return { totalGames: rows.length, wins, losses: rows.length - wins, totalAttempts, distribution };
};

export const saveDailyResult6 = async (dateStr, word, won, attempts) => {
  const upperWord = word.toUpperCase();

  const all = _readDaily();
  const key = `${dateStr}|${upperWord}`;
  if (!all[key]) all[key] = [];
  all[key].push({ won, attempts });
  _writeDaily(all);

  if (supabase) {
    try {
      await supabase.from('daily_results_6').insert({ date: dateStr, word: upperWord, won, attempts });
    } catch {}
  }
};

export const getHistoricalData6 = async () => {
  if (!supabase) return [];
  try {
    const resultsRes = await supabase.from('daily_results_6').select('date, word, won, attempts');
    const results = resultsRes.data || [];
    if (results.length === 0) return [];

    const byKey = {};
    for (const r of results) {
      const word = r.word ? r.word.toUpperCase() : '??????';
      const key = `${r.date}|${word}`;
      if (!byKey[key]) byKey[key] = { date: r.date, word, rows: [] };
      byKey[key].rows.push(r);
    }

    return Object.values(byKey)
      .map(({ date, word, rows }) => {
        const wins = rows.filter(r => r.won).length;
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
        for (const r of rows) {
          if (r.won && r.attempts >= 1 && r.attempts <= 7) dist[r.attempts]++;
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

export const getDailyResults6 = async (dateStr, word) => {
  const upperWord = word?.toUpperCase();
  const cacheKey = `${dateStr}|${upperWord ?? ''}`;

  const cached = _resultsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < _CACHE_TTL) return cached.data;

  const all = _readDaily();
  const localResults = (upperWord && all[`${dateStr}|${upperWord}`]) || [];

  if (supabase) {
    try {
      let query = supabase
        .from('daily_results_6')
        .select('won, attempts')
        .eq('date', dateStr);
      if (upperWord) query = query.eq('word', upperWord);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        _resultsCache.set(cacheKey, { data, ts: Date.now() });
        return data;
      }
    } catch {}
  }

  _resultsCache.set(cacheKey, { data: localResults, ts: Date.now() });
  return localResults;
};
