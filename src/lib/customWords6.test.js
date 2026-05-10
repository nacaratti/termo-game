import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/data/wordList6', () => ({
  VALID_WORDS_6_SET: new Set(['COZIDO', 'BRANCO', 'COMIDA', 'GRACAO']),
}));

import {
  addCustomWord6,
  removeCustomWord6,
  getCustomWords6,
  addToBlacklist6,
  removeFromBlacklist6,
  getBlacklist6,
  isValidGuess6,
} from './customWords6';

beforeEach(() => {
  localStorage.clear();
});

// ─── addCustomWord6 ────────────────────────────────────────────────────────────

describe('addCustomWord6', () => {
  it('adds a valid 6-letter word and returns ok', () => {
    const result = addCustomWord6('KINTOO');
    expect(result.ok).toBe(true);
    expect(getCustomWords6()).toContain('KINTOO');
  });

  it('converts word to uppercase before storing', () => {
    addCustomWord6('kintoo');
    expect(getCustomWords6()).toContain('KINTOO');
  });

  it('rejects words shorter than 6 letters', () => {
    const result = addCustomWord6('BANCO');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/6 letras/i);
  });

  it('rejects words longer than 6 letters', () => {
    const result = addCustomWord6('KINTOOS');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/6 letras/i);
  });

  it('rejects words with accented characters (only A-Z allowed)', () => {
    const result = addCustomWord6('AÇÚCAR'); // 6 letters, accented
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/acentos/i);
  });

  it('rejects words already in VALID_WORDS_6_SET', () => {
    const result = addCustomWord6('COZIDO');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/banco de dados/i);
  });

  it('rejects duplicate custom words', () => {
    addCustomWord6('KINTOO');
    const result = addCustomWord6('KINTOO');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/adicionada/i);
  });

  it('trims whitespace from the word', () => {
    const result = addCustomWord6('KINTOO');
    expect(result.ok).toBe(true);
    expect(getCustomWords6()).toContain('KINTOO');
  });

  it('does not interfere with 5-letter custom words storage', () => {
    addCustomWord6('KINTOO');
    expect(localStorage.getItem('_c4w')).toBeNull();
  });
});

// ─── removeCustomWord6 ─────────────────────────────────────────────────────────

describe('removeCustomWord6', () => {
  it('removes an existing custom word', () => {
    addCustomWord6('KINTOO');
    removeCustomWord6('KINTOO');
    expect(getCustomWords6()).not.toContain('KINTOO');
  });

  it('leaves the list unchanged when word does not exist', () => {
    addCustomWord6('KINTOO');
    removeCustomWord6('NAOTEM');
    expect(getCustomWords6()).toContain('KINTOO');
    expect(getCustomWords6()).toHaveLength(1);
  });

  it('removes only the specified word', () => {
    addCustomWord6('KINTOO');
    addCustomWord6('TESTEE');
    removeCustomWord6('KINTOO');
    expect(getCustomWords6()).not.toContain('KINTOO');
    expect(getCustomWords6()).toContain('TESTEE');
  });
});

// ─── getCustomWords6 ───────────────────────────────────────────────────────────

describe('getCustomWords6', () => {
  it('returns empty array when nothing is stored', () => {
    expect(getCustomWords6()).toEqual([]);
  });

  it('returns all added custom words', () => {
    addCustomWord6('KINTOO');
    addCustomWord6('TESTEE');
    expect(getCustomWords6()).toEqual(expect.arrayContaining(['KINTOO', 'TESTEE']));
    expect(getCustomWords6()).toHaveLength(2);
  });
});

// ─── blacklist ─────────────────────────────────────────────────────────────────

describe('addToBlacklist6 + removeFromBlacklist6 + getBlacklist6', () => {
  it('adds a word to the blacklist', () => {
    addToBlacklist6('BRANCO');
    expect(getBlacklist6()).toContain('BRANCO');
  });

  it('normalizes accented words when adding to blacklist', () => {
    addToBlacklist6('GRAÇAO');
    expect(getBlacklist6()).toContain('GRACAO');
  });

  it('removes a word from the blacklist', () => {
    addToBlacklist6('BRANCO');
    removeFromBlacklist6('BRANCO');
    expect(getBlacklist6()).not.toContain('BRANCO');
  });

  it('returns empty array when blacklist is empty', () => {
    expect(getBlacklist6()).toEqual([]);
  });
});

// ─── isValidGuess6 ─────────────────────────────────────────────────────────────

describe('isValidGuess6', () => {
  it('accepts words in VALID_WORDS_6_SET', () => {
    expect(isValidGuess6('COZIDO')).toBe(true);
    expect(isValidGuess6('BRANCO')).toBe(true);
  });

  it('accepts words that normalize to a valid word', () => {
    expect(isValidGuess6('GRACAO')).toBe(true);
  });

  it('rejects words not in either set', () => {
    expect(isValidGuess6('ZZZZZZ')).toBe(false);
    expect(isValidGuess6('XYZABC')).toBe(false);
  });

  it('accepts custom words added at runtime', () => {
    addCustomWord6('KINTOO');
    expect(isValidGuess6('KINTOO')).toBe(true);
  });

  it('rejects custom words after they are removed', () => {
    addCustomWord6('KINTOO');
    removeCustomWord6('KINTOO');
    expect(isValidGuess6('KINTOO')).toBe(false);
  });

  it('rejects blacklisted words from VALID_WORDS_6_SET', () => {
    addToBlacklist6('BRANCO');
    expect(isValidGuess6('BRANCO')).toBe(false);
  });

  it('rejects blacklisted custom words', () => {
    addCustomWord6('KINTOO');
    addToBlacklist6('KINTOO');
    expect(isValidGuess6('KINTOO')).toBe(false);
  });
});
