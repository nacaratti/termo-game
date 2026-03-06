import { describe, it, expect, beforeEach, vi } from 'vitest';

// Supabase null so all paths fall back to localStorage/deterministic
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { getTodayDateStr, getWordOfDay, setWordOfDay } from './wordOfDay';

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
