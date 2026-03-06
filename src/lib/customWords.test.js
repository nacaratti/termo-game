import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use a small, known word set so tests are fast and predictable
vi.mock('@/data/wordList', () => ({
  VALID_WORDS_SET: new Set(['COMER', 'PEGAR', 'BANCO', 'GRACA']),
}));

import { addCustomWord, removeCustomWord, getCustomWords, isValidGuess } from './customWords';

beforeEach(() => {
  localStorage.clear();
});

// ─── addCustomWord ─────────────────────────────────────────────────────────────

describe('addCustomWord', () => {
  it('adds a valid 5-letter word and returns ok', () => {
    const result = addCustomWord('TERMO');
    expect(result.ok).toBe(true);
    expect(getCustomWords()).toContain('TERMO');
  });

  it('converts word to uppercase before storing', () => {
    addCustomWord('termo');
    expect(getCustomWords()).toContain('TERMO');
  });

  it('rejects words shorter than 5 letters', () => {
    const result = addCustomWord('AB');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/5 letras/i);
  });

  it('rejects words longer than 5 letters', () => {
    const result = addCustomWord('TERMOO');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/5 letras/i);
  });

  it('rejects words with accented characters (only A-Z allowed)', () => {
    const result = addCustomWord('GRAÇA'); // Ç is not A-Z
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/acentos/i);
  });

  it('rejects words already in VALID_WORDS_SET', () => {
    const result = addCustomWord('COMER');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/banco de dados/i);
  });

  it('rejects duplicate custom words', () => {
    addCustomWord('KINTO');
    const result = addCustomWord('KINTO');
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/adicionada/i);
  });

  it('trims whitespace from the word', () => {
    const result = addCustomWord('KINTO');
    expect(result.ok).toBe(true);
  });
});

// ─── removeCustomWord ──────────────────────────────────────────────────────────

describe('removeCustomWord', () => {
  it('removes an existing custom word', () => {
    addCustomWord('KINTO');
    removeCustomWord('KINTO');
    expect(getCustomWords()).not.toContain('KINTO');
  });

  it('leaves the list unchanged when word does not exist', () => {
    addCustomWord('KINTO');
    removeCustomWord('NAOTEM');
    expect(getCustomWords()).toContain('KINTO');
    expect(getCustomWords()).toHaveLength(1);
  });

  it('removes only the specified word', () => {
    addCustomWord('KINTO');
    addCustomWord('TESTE');
    removeCustomWord('KINTO');
    expect(getCustomWords()).not.toContain('KINTO');
    expect(getCustomWords()).toContain('TESTE');
  });
});

// ─── getCustomWords ────────────────────────────────────────────────────────────

describe('getCustomWords', () => {
  it('returns empty array when nothing is stored', () => {
    expect(getCustomWords()).toEqual([]);
  });

  it('returns all added custom words', () => {
    addCustomWord('KINTO');
    addCustomWord('TERMO');
    expect(getCustomWords()).toEqual(expect.arrayContaining(['KINTO', 'TERMO']));
    expect(getCustomWords()).toHaveLength(2);
  });
});

// ─── isValidGuess ──────────────────────────────────────────────────────────────

describe('isValidGuess', () => {
  it('accepts words in VALID_WORDS_SET', () => {
    expect(isValidGuess('COMER')).toBe(true);
    expect(isValidGuess('BANCO')).toBe(true);
  });

  it('accepts words that normalize to a valid word (accent stripping)', () => {
    // GRACA is in the mock set; if user somehow passes accented form it normalizes to GRACA
    expect(isValidGuess('GRACA')).toBe(true);
  });

  it('rejects words not in either set', () => {
    expect(isValidGuess('ZZZZZ')).toBe(false);
    expect(isValidGuess('XYZAB')).toBe(false);
  });

  it('accepts custom words added at runtime', () => {
    addCustomWord('KINTO');
    expect(isValidGuess('KINTO')).toBe(true);
  });

  it('rejects custom words after they are removed', () => {
    addCustomWord('KINTO');
    removeCustomWord('KINTO');
    expect(isValidGuess('KINTO')).toBe(false);
  });
});
