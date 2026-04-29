import rawSolucoes6 from '../../palavras/solucoes_6.txt?raw';
import { supabase } from '@/lib/supabase';
import { getTodayDateStr } from '@/lib/wordOfDay';

const BASE_DATE_UTC = new Date(Date.UTC(2025, 0, 1));
const _K6 = '_g7x6';

const SOLUTION_WORDS_6 = rawSolucoes6
  .split('\n')
  .map(w => w.trim().toUpperCase())
  .filter(w => w.length === 6);

const readCache = () => {
  try { return JSON.parse(atob(localStorage.getItem(_K6) || '')); } catch { return null; }
};
const writeCache = (date, word) => {
  try { localStorage.setItem(_K6, btoa(JSON.stringify({ date, word }))); } catch {}
};

const computeDefaultWord6 = (dateStr) => {
  if (!SOLUTION_WORDS_6.length) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const diffDays = Math.floor((date - BASE_DATE_UTC) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % SOLUTION_WORDS_6.length) + SOLUTION_WORDS_6.length) % SOLUTION_WORDS_6.length;
  return SOLUTION_WORDS_6[index];
};

export const getWordOfDay6 = () => {
  const stored = readCache();
  return stored?.date === getTodayDateStr() ? stored.word.toUpperCase() : null;
};

export const setWordOfDay6 = (word) => {
  writeCache(getTodayDateStr(), word.toUpperCase());
};

export const initWordOfDay6 = async () => {
  const today = getTodayDateStr();

  if (supabase) {
    try {
      const { data } = await supabase
        .from('daily_words_6')
        .select('word')
        .eq('date', today)
        .maybeSingle();

      if (data?.word) {
        const word = data.word.toUpperCase();
        writeCache(today, word);
        return word;
      }

      const autoWord = computeDefaultWord6(today);

      await supabase
        .from('daily_words_6')
        .upsert({ date: today, word: autoWord }, { onConflict: 'date', ignoreDuplicates: true });

      const { data: saved } = await supabase
        .from('daily_words_6')
        .select('word')
        .eq('date', today)
        .maybeSingle();

      if (saved?.word) {
        const word = saved.word.toUpperCase();
        writeCache(today, word);
        return word;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Supabase] initWordOfDay6:', err);
    }
  }

  const cached = readCache();
  if (cached?.date === today) return cached.word;

  const fallback = computeDefaultWord6(today);
  writeCache(today, fallback);
  return fallback;
};
