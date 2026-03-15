import { supabase } from '@/lib/supabase';
import rawSolucoes from '../../palavras/solucoes.txt?raw';

// Brasília = UTC-3 (sem horário de verão desde 2019)
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

// Lista de soluções — usada apenas para seleção automática da palavra do dia
const SOLUTION_WORDS = rawSolucoes
  .split('\n')
  .map(w => w.trim().toUpperCase())
  .filter(w => w.length === 5);

// Data base para o índice determinístico
const BASE_DATE_UTC = new Date(Date.UTC(2025, 0, 1)); // 2025-01-01

// Chave interna — propositalmente não descritiva
const _K = '_g7x';

export const getTodayDateStr = () => {
  const brasilia = new Date(Date.now() + BRASILIA_OFFSET_MS);
  return `${brasilia.getUTCFullYear()}-${String(brasilia.getUTCMonth() + 1).padStart(2, '0')}-${String(brasilia.getUTCDate()).padStart(2, '0')}`;
};

export const getDeterministicIndexForDate = (dateStr, listLength) => {
  if (!listLength) return 0;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const diffDays = Math.floor((date - BASE_DATE_UTC) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % listLength) + listLength) % listLength;
  return index;
};

export const computeDefaultWord = (dateStr, solutionWordsOverride = SOLUTION_WORDS) => {
  const list = solutionWordsOverride;
  if (!list || list.length === 0) return '';
  const index = getDeterministicIndexForDate(dateStr, list.length);
  return list[index];
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
 * determinísticamente pela data e salva — sem precisar de intervenção do admin.
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

      // 2. Não existe — seleciona determinísticamente pela data
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
