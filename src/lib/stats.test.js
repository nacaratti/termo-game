import { describe, it, expect, beforeEach, vi } from 'vitest';

// Supabase will be null in test env (no env vars), but mock it explicitly for safety
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { getStats, saveGameResult, resetStats } from './stats';

beforeEach(() => {
  localStorage.clear();
});

// ─── getStats ──────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns default stats when nothing is stored', () => {
    const stats = getStats();
    expect(stats.totalGames).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.totalAttempts).toBe(0);
    expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
  });

  it('fills missing distribution keys with 0 (default merge)', () => {
    saveGameResult(true, 3);
    const stats = getStats();
    // Keys not touched by saveGameResult should still exist
    expect(stats.distribution[1]).toBe(0);
    expect(stats.distribution[2]).toBe(0);
    expect(stats.distribution[4]).toBe(0);
  });
});

// ─── saveGameResult ────────────────────────────────────────────────────────────

describe('saveGameResult', () => {
  it('increments totalGames and wins on a win', () => {
    saveGameResult(true, 3);
    const stats = getStats();
    expect(stats.totalGames).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.totalAttempts).toBe(3);
    expect(stats.distribution[3]).toBe(1);
  });

  it('increments totalGames and losses on a loss', () => {
    saveGameResult(false, 6);
    const stats = getStats();
    expect(stats.totalGames).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(1);
    expect(stats.totalAttempts).toBe(6);
    // Losses do not count in distribution
    expect(stats.distribution[6]).toBe(0);
  });

  it('accumulates multiple results correctly', () => {
    saveGameResult(true, 2);
    saveGameResult(true, 2);
    saveGameResult(false, 6);
    const stats = getStats();
    expect(stats.totalGames).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.totalAttempts).toBe(10); // 2 + 2 + 6
    expect(stats.distribution[2]).toBe(2);
    expect(stats.distribution[6]).toBe(0); // loss not counted
  });

  it('tracks distribution per attempt count independently', () => {
    saveGameResult(true, 1);
    saveGameResult(true, 3);
    saveGameResult(true, 3);
    saveGameResult(true, 6);
    const stats = getStats();
    expect(stats.distribution[1]).toBe(1);
    expect(stats.distribution[3]).toBe(2);
    expect(stats.distribution[6]).toBe(1);
  });
});

// ─── resetStats ───────────────────────────────────────────────────────────────

describe('resetStats', () => {
  it('clears all stats back to default', () => {
    saveGameResult(true, 3);
    saveGameResult(false, 6);
    resetStats();
    const stats = getStats();
    expect(stats.totalGames).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.totalAttempts).toBe(0);
  });
});
