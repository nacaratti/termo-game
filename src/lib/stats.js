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

// ─── Per-word results (global via Supabase, local como fallback) ──────────────

/**
 * Salva o resultado associado à palavra específica — não apenas à data.
 * Se admin trocar a palavra no mesmo dia, cada palavra acumula seus próprios resultados.
 */
export const saveDailyResult = async (dateStr, word, won, attempts) => {
  const upperWord = word.toUpperCase();

  // Salva localmente com chave (date|word) para separar palavras do mesmo dia
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    const key = `${dateStr}|${upperWord}`;
    if (!all[key]) all[key] = [];
    all[key].push({ won, attempts });
    localStorage.setItem(DAILY_KEY, JSON.stringify(all));
  } catch { /* ignore */ }

  // Salva no Supabase com a coluna word
  if (supabase) {
    try {
      await supabase.from('daily_results').insert({ date: dateStr, word: upperWord, won, attempts });
    } catch { /* ignora erros de rede silenciosamente */ }
  }
};

/**
 * Retorna estatísticas globais de todos os jogos.
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
 */
export const saveDailyWord = async (dateStr, word) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('daily_words')
    .upsert({ date: dateStr, word: word.toUpperCase() });
  if (error) {
    if (import.meta.env.DEV) console.error('[Supabase] saveDailyWord:', error);
    throw error;
  }
};

/**
 * Retorna o histórico agrupado por (date, word).
 * Se a palavra mudar no mesmo dia, aparecem como entradas separadas no histórico.
 */
export const getHistoricalData = async () => {
  if (!supabase) return [];
  try {
    const resultsRes = await supabase.from('daily_results').select('date, word, won, attempts');
    const results = resultsRes.data || [];
    if (results.length === 0) return [];

    // Agrupa por (date, word) — palavras diferentes no mesmo dia ficam separadas.
    // Registros sem word (pré-migração) usam o cálculo determinístico — nunca a
    // palavra atual de daily_words, pois ela já pode ter sido trocada pelo admin.
    const byKey = {};
    for (const r of results) {
      const word = r.word
        ? r.word.toUpperCase()
        : getWordForDate(r.date);
      const key = `${r.date}|${word}`;
      if (!byKey[key]) byKey[key] = { date: r.date, word, rows: [] };
      byKey[key].rows.push(r);
    }

    return Object.values(byKey)
      .map(({ date, word, rows }) => {
        const wins = rows.filter(r => r.won).length;
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        for (const r of rows) {
          if (r.won && r.attempts >= 1 && r.attempts <= 6) dist[r.attempts]++;
        }
        return {
          date,
          word,
          totalGames: rows.length,
          wins,
          losses: rows.length - wins,
          distribution: dist,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.word.localeCompare(a.word));
  } catch {
    return [];
  }
};

/**
 * Busca os resultados de uma palavra específica.
 * Filtra por (date, word) para não misturar resultados de palavras diferentes do mesmo dia.
 */
export const getDailyResults = async (dateStr, word) => {
  const upperWord = word?.toUpperCase();

  // Cache local
  let localResults = [];
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    // Tenta chave nova (date|word), fallback para chave antiga (date) para compatibilidade
    localResults = (upperWord && all[`${dateStr}|${upperWord}`]) || all[dateStr] || [];
  } catch { /* ignore */ }

  if (supabase) {
    try {
      let query = supabase
        .from('daily_results')
        .select('won, attempts')
        .eq('date', dateStr);
      if (upperWord) query = query.eq('word', upperWord);
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Supabase] getDailyResults:', err);
    }
  }

  return localResults;
};
