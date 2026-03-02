import { SOLUTION_WORDS } from '@/data/wordList';
import { supabase } from '@/lib/supabase';

const WOD_KEY = 'termo_word_of_day';

export const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const hashDate = (dateStr) => {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (Math.imul(31, h) + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const computeDefaultWord = () => {
  const idx = hashDate(getTodayDateStr()) % SOLUTION_WORDS.length;
  return SOLUTION_WORDS[idx].toUpperCase();
};

/** Returns today's word. If admin hasn't overridden it, uses deterministic date-based selection. */
export const getWordOfDay = () => {
  const today = getTodayDateStr();
  try {
    const stored = JSON.parse(localStorage.getItem(WOD_KEY));
    if (stored && stored.date === today) return stored.word.toUpperCase();
  } catch { /* ignore */ }

  const word = computeDefaultWord();
  localStorage.setItem(WOD_KEY, JSON.stringify({ date: today, word }));
  return word;
};

/** Async init: busca palavra do Supabase; sorteia e salva se não existir para hoje. */
export const initWordOfDay = async () => {
  const today = getTodayDateStr();
  if (supabase) {
    try {
      // 1. Busca palavra já sorteada para hoje
      const { data } = await supabase
        .from('daily_words')
        .select('word')
        .eq('date', today)
        .single();

      if (data?.word) {
        const word = data.word.toUpperCase();
        localStorage.setItem(WOD_KEY, JSON.stringify({ date: today, word }));
        return word;
      }

      // 2. Não existe ainda — sorteia e tenta salvar (primeiro jogador do dia)
      const randomWord = SOLUTION_WORDS[
        Math.floor(Math.random() * SOLUTION_WORDS.length)
      ].toUpperCase();

      await supabase
        .from('daily_words')
        .upsert({ date: today, word: randomWord }, { onConflict: 'date', ignoreDuplicates: true });

      // 3. Re-busca para garantir a palavra que foi salva (resolve race condition)
      const { data: saved } = await supabase
        .from('daily_words')
        .select('word')
        .eq('date', today)
        .single();

      if (saved?.word) {
        const word = saved.word.toUpperCase();
        localStorage.setItem(WOD_KEY, JSON.stringify({ date: today, word }));
        return word;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Supabase] initWordOfDay:', err);
    }
  }
  return getWordOfDay();
};

/** Admin override: sets word of the day for today. */
export const setWordOfDay = (word) => {
  const today = getTodayDateStr();
  localStorage.setItem(WOD_KEY, JSON.stringify({ date: today, word: word.toUpperCase() }));
};

/** Computes the deterministic word for any given date string (YYYY-MM-DD). */
export const getWordForDate = (dateStr) => {
  const idx = hashDate(dateStr) % SOLUTION_WORDS.length;
  return SOLUTION_WORDS[idx].toUpperCase();
};

/** Returns the stored { date, word } object, or null if not set. */
export const getStoredWordOfDay = () => {
  try {
    return JSON.parse(localStorage.getItem(WOD_KEY));
  } catch {
    return null;
  }
};
