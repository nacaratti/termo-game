import { SOLUTION_WORDS } from '@/data/wordList';

const WOD_KEY = 'termo_word_of_day';

export const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const computeDefaultWord = () => {
  const start = new Date(2025, 0, 1);
  const now = new Date();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const idx = ((days % SOLUTION_WORDS.length) + SOLUTION_WORDS.length) % SOLUTION_WORDS.length;
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

/** Admin override: sets word of the day for today. */
export const setWordOfDay = (word) => {
  const today = getTodayDateStr();
  localStorage.setItem(WOD_KEY, JSON.stringify({ date: today, word: word.toUpperCase() }));
};

/** Returns the stored { date, word } object, or null if not set. */
export const getStoredWordOfDay = () => {
  try {
    return JSON.parse(localStorage.getItem(WOD_KEY));
  } catch {
    return null;
  }
};
