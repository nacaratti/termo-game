import { describe, it, expect, beforeEach, vi } from 'vitest';

// Supabase null so all paths fall back to localStorage/deterministic
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import {
  getTodayDateStr,
  getWordOfDay,
  setWordOfDay,
  getDeterministicIndexForDate,
  computeDefaultWord,
} from './wordOfDay';

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

// ─── getTodayDateStr ───────────────────────────────────────────────────────────

describe('getTodayDateStr', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    expect(getTodayDateStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the current date in Brasília time (UTC-3)', () => {
    const brasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const expected = [
      brasilia.getUTCFullYear(),
      String(brasilia.getUTCMonth() + 1).padStart(2, '0'),
      String(brasilia.getUTCDate()).padStart(2, '0'),
    ].join('-');
    expect(getTodayDateStr()).toBe(expected);
  });

  it('accounts for UTC-3 offset (not plain UTC)', () => {
    // At 01:00 UTC the date in UTC is day D but in Brasília (UTC-3) it is still day D-1.
    // Fake the clock to be 2026-03-05T01:30:00Z (01:30 UTC = 22:30 Brasília on Mar 4)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T01:30:00Z'));
    expect(getTodayDateStr()).toBe('2026-03-04'); // still March 4 in Brasília
    vi.useRealTimers();
  });

  it('crosses midnight at 03:00 UTC (= 00:00 Brasília)', () => {
    vi.useFakeTimers();
    // Just before midnight Brasília: 02:59 UTC = 23:59 Brasília (Mar 4)
    vi.setSystemTime(new Date('2026-03-05T02:59:00Z'));
    expect(getTodayDateStr()).toBe('2026-03-04');

    // Just after midnight Brasília: 03:01 UTC = 00:01 Brasília (Mar 5)
    vi.setSystemTime(new Date('2026-03-05T03:01:00Z'));
    expect(getTodayDateStr()).toBe('2026-03-05');
    vi.useRealTimers();
  });
});

// ─── getWordOfDay + setWordOfDay ───────────────────────────────────────────────

describe('getWordOfDay', () => {
  it('returns null when nothing is stored', () => {
    expect(getWordOfDay()).toBeNull();
  });
});

describe('setWordOfDay + getWordOfDay', () => {
  it('stores and retrieves the word of the day', () => {
    setWordOfDay('BANCO');
    expect(getWordOfDay()).toBe('BANCO');
  });

  it('converts the stored word to uppercase', () => {
    setWordOfDay('banco');
    expect(getWordOfDay()).toBe('BANCO');
  });

  it('overwrites a previously stored word', () => {
    setWordOfDay('BANCO');
    setWordOfDay('TERMO');
    expect(getWordOfDay()).toBe('TERMO');
  });

  it('returns null after date changes (word is for a different day)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T12:00:00Z'));
    setWordOfDay('BANCO');
    expect(getWordOfDay()).toBe('BANCO');

    // Advance to next day (after 03:00 UTC = midnight Brasília)
    vi.setSystemTime(new Date('2026-03-05T04:00:00Z'));
    expect(getWordOfDay()).toBeNull();
    vi.useRealTimers();
  });
});

// ─── seleção determinística de palavra ──────────────────────────────────────────

describe('getDeterministicIndexForDate', () => {
  it('returns a stable index for the same date and list length', () => {
    const idx1 = getDeterministicIndexForDate('2030-01-15', 100);
    const idx2 = getDeterministicIndexForDate('2030-01-15', 100);
    expect(idx1).toBe(idx2);
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx1).toBeLessThan(100);
  });

  it('handles negative offsets by wrapping within the list length', () => {
    const idx = getDeterministicIndexForDate('2020-01-01', 10); // antes da BASE_DATE_UTC
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(10);
  });
});

describe('computeDefaultWord', () => {
  it('cycles through the entire solution list as days advance', () => {
    const fakeSolutions = ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE'];

    // Começa em uma data arbitrária, a lógica importa apenas a diferença de dias
    const start = new Date(Date.UTC(2030, 0, 1)); // 2030-01-01
    const used = new Set();

    for (let i = 0; i < fakeSolutions.length; i++) {
      const current = new Date(start.getTime());
      current.setUTCDate(start.getUTCDate() + i);
      const dateStr = [
        current.getUTCFullYear(),
        String(current.getUTCMonth() + 1).padStart(2, '0'),
        String(current.getUTCDate()).padStart(2, '0'),
      ].join('-');

      const word = computeDefaultWord(dateStr, fakeSolutions);
      used.add(word);
    }

    // Todas as palavras da lista devem ter sido usadas exatamente uma vez
    expect(used.size).toBe(fakeSolutions.length);
    expect(Array.from(used).sort()).toEqual([...fakeSolutions].sort());
  });
});
