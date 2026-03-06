import { describe, it, expect } from 'vitest';
import { normalizeLetter, normalizeWord } from './normalize';

describe('normalizeLetter', () => {
  it('leaves plain uppercase letter unchanged', () => {
    expect(normalizeLetter('A')).toBe('A');
    expect(normalizeLetter('Z')).toBe('Z');
    expect(normalizeLetter('M')).toBe('M');
  });

  it('converts lowercase to uppercase', () => {
    expect(normalizeLetter('a')).toBe('A');
    expect(normalizeLetter('z')).toBe('Z');
  });

  it('strips cedilla (Ç → C)', () => {
    expect(normalizeLetter('Ç')).toBe('C');
    expect(normalizeLetter('ç')).toBe('C');
  });

  it('strips acute accents', () => {
    expect(normalizeLetter('É')).toBe('E');
    expect(normalizeLetter('Á')).toBe('A');
    expect(normalizeLetter('Ó')).toBe('O');
    expect(normalizeLetter('Ú')).toBe('U');
    expect(normalizeLetter('Í')).toBe('I');
  });

  it('strips tilde', () => {
    expect(normalizeLetter('Ã')).toBe('A');
    expect(normalizeLetter('Õ')).toBe('O');
  });

  it('strips circumflex', () => {
    expect(normalizeLetter('Â')).toBe('A');
    expect(normalizeLetter('Ê')).toBe('E');
    expect(normalizeLetter('Ô')).toBe('O');
  });
});

describe('normalizeWord', () => {
  it('leaves plain word unchanged', () => {
    expect(normalizeWord('FUMAR')).toBe('FUMAR');
    expect(normalizeWord('BANCO')).toBe('BANCO');
  });

  it('strips accents from all characters', () => {
    expect(normalizeWord('GRAÇA')).toBe('GRACA');
    expect(normalizeWord('AÇÃO')).toBe('ACAO');
    expect(normalizeWord('ENTÃO')).toBe('ENTAO');
    expect(normalizeWord('FUMAÇ')).toBe('FUMAC');
  });

  it('normalizes mixed case', () => {
    expect(normalizeWord('graça')).toBe('GRACA');
    expect(normalizeWord('Então')).toBe('ENTAO');
  });

  it('handles words without accents', () => {
    expect(normalizeWord('COMER')).toBe('COMER');
  });
});
