import { supabase } from '@/lib/supabase';

// Chave interna — propositalmente não descritiva
const _K = '_g7x';

export const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const readCache = () => {
  try { return JSON.parse(atob(localStorage.getItem(_K) || '')); } catch { return null; }
};

const writeCache = (date, word) => {
  try { localStorage.setItem(_K, btoa(JSON.stringify({ date, word }))); } catch { /* ignore */ }
};

/** Retorna a palavra do cache local, ou null se não disponível para hoje. */
export const getWordOfDay = () => {
  const stored = readCache();
  return stored?.date === getTodayDateStr() ? stored.word.toUpperCase() : null;
};

/**
 * Async init: busca a palavra do Supabase; usa cache local como fallback.
 * Retorna null se a palavra não está disponível (admin ainda não definiu).
 */
export const initWordOfDay = async () => {
  const today = getTodayDateStr();

  if (supabase) {
    try {
      const { data } = await supabase
        .from('daily_words')
        .select('word')
        .eq('date', today)
        .maybeSingle();

      if (data?.word) {
        const word = data.word.toUpperCase();
        writeCache(today, word);
        return word;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Supabase] initWordOfDay:', err);
    }
  }

  // Fallback: cache local (cobre ausência temporária de rede)
  return getWordOfDay();
};

/** Admin override: define a palavra do dia localmente. */
export const setWordOfDay = (word) => {
  writeCache(getTodayDateStr(), word.toUpperCase());
};
