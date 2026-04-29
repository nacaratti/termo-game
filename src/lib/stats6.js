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
