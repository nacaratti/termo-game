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

// ─── Per-day results ──────────────────────────────────────────────────────────

/** Returns array of { won, attempts } for a given date string (YYYY-MM-DD). */
export const getDailyResults = (dateStr) => {
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    return all[dateStr] || [];
  } catch {
    return [];
  }
};

/** Appends a result { won, attempts } for the given date. */
export const saveDailyResult = (dateStr, won, attempts) => {
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    if (!all[dateStr]) all[dateStr] = [];
    all[dateStr].push({ won, attempts });
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
};
