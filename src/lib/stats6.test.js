import { describe, it, expect, beforeEach, vi } from 'vitest';

// stats6.js tem um cache de módulo (_resultsCache) que persiste entre testes.
// Resetamos os módulos a cada teste para garantir estado limpo.
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.mock('@/lib/supabase', () => ({ supabase: null }));
});

// ─── saveDailyResult6 ─────────────────────────────────────────────────────────

describe('saveDailyResult6', () => {
  it('saves a win to localStorage', async () => {
    const { saveDailyResult6, getDailyResults6 } = await import('./stats6');
    await saveDailyResult6('2026-05-01', 'CAVALO', true, 4);
    const results = await getDailyResults6('2026-05-01', 'CAVALO');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ won: true, attempts: 4 });
  });

  it('saves a loss to localStorage', async () => {
    const { saveDailyResult6, getDailyResults6 } = await import('./stats6');
    await saveDailyResult6('2026-05-02', 'CAVALO', false, 7);
    const results = await getDailyResults6('2026-05-02', 'CAVALO');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ won: false, attempts: 7 });
  });

  it('accumulates multiple results for the same word/date', async () => {
    const { saveDailyResult6, getDailyResults6 } = await import('./stats6');
    await saveDailyResult6('2026-05-03', 'CAVALO', true, 3);
    await saveDailyResult6('2026-05-03', 'CAVALO', true, 5);
    await saveDailyResult6('2026-05-03', 'CAVALO', false, 7);
    const results = await getDailyResults6('2026-05-03', 'CAVALO');
    expect(results).toHaveLength(3);
  });

  it('normalizes word to uppercase', async () => {
    const { saveDailyResult6, getDailyResults6 } = await import('./stats6');
    await saveDailyResult6('2026-05-04', 'cavalo', true, 2);
    const results = await getDailyResults6('2026-05-04', 'CAVALO');
    expect(results).toHaveLength(1);
  });

  it('stores results for different words independently', async () => {
    const { saveDailyResult6, getDailyResults6 } = await import('./stats6');
    await saveDailyResult6('2026-05-05', 'CAVALO', true, 3);
    await saveDailyResult6('2026-05-05', 'BARCO', true, 4);
    expect(await getDailyResults6('2026-05-05', 'CAVALO')).toHaveLength(1);
    expect(await getDailyResults6('2026-05-05', 'BARCO')).toHaveLength(1);
  });
});

// ─── getDailyResults6 ─────────────────────────────────────────────────────────

describe('getDailyResults6', () => {
  it('returns empty array when nothing is stored', async () => {
    const { getDailyResults6 } = await import('./stats6');
    const results = await getDailyResults6('2026-06-01', 'CAVALO');
    expect(results).toEqual([]);
  });

  it('returns empty array for a different date', async () => {
    const { saveDailyResult6, getDailyResults6 } = await import('./stats6');
    await saveDailyResult6('2026-06-02', 'CAVALO', true, 3);
    const results = await getDailyResults6('2026-06-03', 'CAVALO');
    expect(results).toEqual([]);
  });
});

// ─── getGlobalStats6 ──────────────────────────────────────────────────────────

describe('getGlobalStats6', () => {
  it('returns zero stats when nothing is stored', async () => {
    const { getGlobalStats6 } = await import('./stats6');
    const stats = await getGlobalStats6();
    expect(stats.totalGames).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.totalAttempts).toBe(0);
    expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
  });

  it('aggregates wins correctly', async () => {
    const { saveDailyResult6, getGlobalStats6 } = await import('./stats6');
    await saveDailyResult6('2026-07-01', 'PALAVRA', true, 3);
    await saveDailyResult6('2026-07-01', 'PALAVRA', true, 5);
    const stats = await getGlobalStats6();
    expect(stats.totalGames).toBe(2);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(0);
    expect(stats.totalAttempts).toBe(8);
    expect(stats.distribution[3]).toBe(1);
    expect(stats.distribution[5]).toBe(1);
  });

  it('aggregates losses correctly', async () => {
    const { saveDailyResult6, getGlobalStats6 } = await import('./stats6');
    await saveDailyResult6('2026-07-02', 'PALAVRA', false, 7);
    const stats = await getGlobalStats6();
    expect(stats.totalGames).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(1);
    expect(stats.totalAttempts).toBe(7);
    expect(stats.distribution[7]).toBe(0);
  });

  it('aggregates mixed results across different dates', async () => {
    const { saveDailyResult6, getGlobalStats6 } = await import('./stats6');
    await saveDailyResult6('2026-07-03', 'CAVALO', true, 4);
    await saveDailyResult6('2026-07-03', 'CAVALO', false, 7);
    await saveDailyResult6('2026-07-04', 'TAPETE', true, 2);
    const stats = await getGlobalStats6();
    expect(stats.totalGames).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.totalAttempts).toBe(13);
    expect(stats.distribution[4]).toBe(1);
    expect(stats.distribution[2]).toBe(1);
  });

  it('does not count wins in distribution when attempts > 7', async () => {
    const { saveDailyResult6, getGlobalStats6 } = await import('./stats6');
    await saveDailyResult6('2026-07-05', 'CAVALO', true, 8);
    const stats = await getGlobalStats6();
    const distSum = Object.values(stats.distribution).reduce((a, b) => a + b, 0);
    expect(distSum).toBe(0);
    expect(stats.wins).toBe(1);
  });
});
