import { supabase } from '@/lib/supabase';

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
