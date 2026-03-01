import { supabase } from '@/lib/supabase';
import { getWordForDate } from '@/lib/wordOfDay';

const STATS_KEY = 'termo_stats';
const DAILY_KEY = 'termo_daily_results';

const defaultStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  totalAttempts: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

export const getStats = () => {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (!stored) return { ...defaultStats, distribution: { ...defaultStats.distribution } };
    const parsed = JSON.parse(stored);
    return { ...defaultStats, ...parsed, distribution: { ...defaultStats.distribution, ...parsed.distribution } };
  } catch {
    return { ...defaultStats, distribution: { ...defaultStats.distribution } };
  }
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
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const resetStats = () => {
  localStorage.removeItem(STATS_KEY);
};

// ─── Per-day results (global via Supabase, local como fallback) ───────────────

/**
 * Salva o resultado no Supabase (compartilhado entre todos os dispositivos)
 * e também no localStorage como cache offline.
 */
export const saveDailyResult = async (dateStr, won, attempts) => {
  // Salva localmente (cache / fallback offline)
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    if (!all[dateStr]) all[dateStr] = [];
    all[dateStr].push({ won, attempts });
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch { /* ignore */ }

  // Salva no Supabase para ranking global
  if (supabase) {
    try {
      await supabase.from('daily_results').insert({ date: dateStr, won, attempts });
    } catch { /* ignora erros de rede silenciosamente */ }
  }
};

/**
 * Retorna estatísticas globais de todos os jogos agregando registros do Supabase.
 * Fallback para localStorage se Supabase não estiver disponível.
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
 * Chamado pelo painel admin ao alterar a palavra.
 */
export const saveDailyWord = async (dateStr, word) => {
  if (!supabase) return;
  try {
    await supabase.from('daily_words').upsert({ date: dateStr, word: word.toUpperCase() });
  } catch { /* ignore */ }
};

/**
 * Retorna o histórico de todos os dias com dados, ordenado do mais recente.
 * Agrega daily_results por data e cruza com daily_words para obter a palavra.
 * Fallback: computa a palavra pelo algoritmo padrão.
 */
export const getHistoricalData = async () => {
  if (!supabase) return [];
  try {
    const resultsRes = await supabase.from('daily_results').select('date, won, attempts');
    const results = resultsRes.data || [];
    if (results.length === 0) return [];

    // daily_words é opcional — se a tabela não existir ainda, usa palavra calculada
    const wordMap = {};
    try {
      const wordsRes = await supabase.from('daily_words').select('date, word');
      for (const w of (wordsRes.data || [])) wordMap[w.date] = w.word.toUpperCase();
    } catch { /* tabela ainda não criada */ }

    const byDate = {};
    for (const r of results) {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    }

    return Object.entries(byDate)
      .map(([date, rows]) => {
        const wins = rows.filter(r => r.won).length;
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const r of rows) {
          if (r.won && r.attempts >= 1 && r.attempts <= 6) dist[r.attempts]++;
        }
        return {
          date,
          word: wordMap[date] || getWordForDate(date),
          totalGames: rows.length,
          wins,
          losses: rows.length - wins,
          distribution: dist,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
};

/**
 * Busca os resultados do dia no Supabase.
 * Se Supabase não estiver configurado ou falhar, usa localStorage como fallback.
 */
export const getDailyResults = async (dateStr) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_results')
        .select('won, attempts')
        .eq('date', dateStr);
      if (!error && data) return data;
    } catch { /* cai no fallback */ }
  }

  // Fallback: dados locais
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    return all[dateStr] || [];
  } catch {
    return [];
  }
};
