import { getTodayDateStr } from '@/lib/wordOfDay';

const DAILY_KEY_5 = '_s2z';
const DAILY_KEY_6 = '_s2z6';

const readDaily = (key) => {
  try { return JSON.parse(atob(localStorage.getItem(key) || '')); } catch { return {}; }
};

const dateMinusOne = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

export const getStreak = () => {
  const d5 = readDaily(DAILY_KEY_5);
  const d6 = readDaily(DAILY_KEY_6);

  const dates = new Set();
  for (const key of [...Object.keys(d5), ...Object.keys(d6)]) {
    const date = key.split('|')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
  }

  let streak = 0;
  let check = getTodayDateStr();

  while (dates.has(check)) {
    streak++;
    check = dateMinusOne(check);
  }

  return streak;
};
