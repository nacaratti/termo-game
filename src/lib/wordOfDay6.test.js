import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { getWordOfDay6, setWordOfDay6 } from './wordOfDay6';

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

// ─── getWordOfDay6 ────────────────────────────────────────────────────────────

describe('getWordOfDay6', () => {
  it('returns null when nothing is stored', () => {
    expect(getWordOfDay6()).toBeNull();
  });
});

// ─── setWordOfDay6 + getWordOfDay6 ────────────────────────────────────────────

describe('setWordOfDay6 + getWordOfDay6', () => {
  it('stores and retrieves the word of the day', () => {
    setWordOfDay6('CAVALO');
    expect(getWordOfDay6()).toBe('CAVALO');
  });

  it('converts the stored word to uppercase', () => {
    setWordOfDay6('cavalo');
    expect(getWordOfDay6()).toBe('CAVALO');
  });

  it('overwrites a previously stored word', () => {
    setWordOfDay6('CAVALO');
    setWordOfDay6('BARCOS');
    expect(getWordOfDay6()).toBe('BARCOS');
  });

  it('returns null after date changes (word is for a different day)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T12:00:00Z'));
    setWordOfDay6('CAVALO');
    expect(getWordOfDay6()).toBe('CAVALO');

    // Advance to next day (after 03:00 UTC = midnight Brasília)
    vi.setSystemTime(new Date('2026-03-05T04:00:00Z'));
    expect(getWordOfDay6()).toBeNull();
    vi.useRealTimers();
  });
});
