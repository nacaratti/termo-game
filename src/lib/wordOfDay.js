import { supabase } from '@/lib/supabase';
import rawSolucoes from '../../palavras/solucoes.txt?raw';

// Brasília = UTC-3 (sem horário de verão desde 2019)
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

// Lista de soluções — usada apenas para seleção automática da palavra do dia
const SOLUTION_WORDS = rawSolucoes
  .split('\n')
  .map(w => w.trim().toUpperCase())
  .filter(w => w.length === 5);

// Chave interna — propositalmente não descritiva
const _K = '_g7x';

export const getTodayDateStr = () => {
  const brasilia = new Date(Date.now() + BRASILIA_OFFSET_MS);
  return `${brasilia.getUTCFullYear()}-${String(brasilia.getUTCMonth() + 1).padStart(2, '0')}-${String(brasilia.getUTCDate()).padStart(2, '0')}`;
};

const hashDate = (dateStr) => {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (Math.imul(31, h) + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const computeDefaultWord = (dateStr) => {
  return SOLUTION_WORDS[hashDate(dateStr) % SOLUTION_WORDS.length];
};

const readCache = () => {
  try { return JSON.parse(atob(localStorage.getItem(_K) || '')); } catch { return null; }
};

const writeCache = (date, word) => {
  try { localStorage.setItem(_K, btoa(JSON.stringify({ date, word }))); } catch { /* ignore */ }
};

/** Retorna a palavra do cache local para hoje, ou null. */
export const getWordOfDay = () => {
  const stored = readCache();
  return stored?.date === getTodayDateStr() ? stored.word.toUpperCase() : null;
};

/**
 * Async init: busca palavra do Supabase; se não existir para hoje, seleciona
 * automaticamente pela hash da data e salva — sem precisar de intervenção do admin.
 */
export const initWordOfDay = async () => {
  const today = getTodayDateStr();

  if (supabase) {
    try {
      // 1. Tenta buscar a palavra já definida para hoje
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

      // 2. Não existe — seleciona determinísticamente pela hash da data
      const autoWord = computeDefaultWord(today);

      // 3. Salva no Supabase (race-condition seguro com ignoreDuplicates)
      await supabase
        .from('daily_words')
        .upsert({ date: today, word: autoWord }, { onConflict: 'date', ignoreDuplicates: true });

      // 4. Re-busca para confirmar a palavra que ficou gravada
      const { data: saved } = await supabase
        .from('daily_words')
        .select('word')
        .eq('date', today)
        .maybeSingle();

      if (saved?.word) {
        const word = saved.word.toUpperCase();
        writeCache(today, word);
        return word;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Supabase] initWordOfDay:', err);
    }
  }

  // Fallback offline: cache local ou seleção determinística
  const cached = getWordOfDay();
  if (cached) return cached;

  const fallback = computeDefaultWord(today);
  writeCache(today, fallback);
  return fallback;
};

/** Admin override: define manualmente a palavra do dia. */
export const setWordOfDay = (word) => {
  writeCache(getTodayDateStr(), word.toUpperCase());
};
