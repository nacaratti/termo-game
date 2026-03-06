import { describe, it, expect } from 'vitest';
import { checkGuess, getTileStyling, getKeyboardKeyColor } from './gameLogic';

// ─── checkGuess ────────────────────────────────────────────────────────────────

describe('checkGuess', () => {
  it('marks all correct for exact match', () => {
    const { isCorrect, guessEvaluation } = checkGuess('BANCO', 'BANCO', {});
    expect(isCorrect).toBe(true);
    expect(guessEvaluation.every(e => e.status === 'correct')).toBe(true);
  });

  it('marks all absent when no letters match', () => {
    // TURFE and BANCO share no letters
    const { isCorrect, guessEvaluation } = checkGuess('TURFE', 'BANCO', {});
    expect(isCorrect).toBe(false);
    expect(guessEvaluation.every(e => e.status === 'absent')).toBe(true);
  });

  it('marks all present for anagram with no letter in correct position', () => {
    // EABCD is ABCDE rotated left — every letter present but none in place
    const { isCorrect, guessEvaluation } = checkGuess('EABCD', 'ABCDE', {});
    expect(isCorrect).toBe(false);
    expect(guessEvaluation.every(e => e.status === 'present')).toBe(true);
  });

  it('handles mixed correct/present/absent statuses', () => {
    // BANCO vs BADCO: B correct, A correct, N absent (not in BADCO), C correct, O correct
    // Wait — let's check BANCO vs BANDO: B✓ A✓ N✓ D≠C→absent O✓
    const { guessEvaluation } = checkGuess('BANDO', 'BANCO', {});
    expect(guessEvaluation[0].status).toBe('correct'); // B
    expect(guessEvaluation[1].status).toBe('correct'); // A
    expect(guessEvaluation[2].status).toBe('correct'); // N
    expect(guessEvaluation[3].status).toBe('absent');  // D (not in BANCO)
    expect(guessEvaluation[4].status).toBe('correct'); // O
  });

  it('does not over-mark duplicate letters in guess', () => {
    // BBBCO vs BANCO: only one B in solution, so B[1] and B[2] should be absent
    const { guessEvaluation } = checkGuess('BBBCO', 'BANCO', {});
    expect(guessEvaluation[0].status).toBe('correct'); // B (pos 0 matches)
    expect(guessEvaluation[1].status).toBe('absent');  // B (no more B available)
    expect(guessEvaluation[2].status).toBe('absent');  // B (no more B available)
    expect(guessEvaluation[3].status).toBe('correct'); // C
    expect(guessEvaluation[4].status).toBe('correct'); // O
  });

  it('matches normalized guess to accented solution (Ç/C)', () => {
    // User types GRACA, solution is GRAÇA — should match via normalization
    const { isCorrect } = checkGuess('GRACA', 'GRAÇA', {});
    expect(isCorrect).toBe(true);
  });

  it('reveals accented letters from solution on winning guess', () => {
    const { guessEvaluation } = checkGuess('GRACA', 'GRAÇA', {});
    // Winning guess: letters shown from solutionArr, so Ç appears
    expect(guessEvaluation[3].letter).toBe('Ç');
    expect(guessEvaluation[0].letter).toBe('G');
  });

  it('does NOT reveal accented letters on partial (non-winning) guess', () => {
    // GRACA vs GRAÇO: G,R,A,C correct, A vs O absent → not winning
    const { isCorrect, guessEvaluation } = checkGuess('GRACA', 'GRAÇO', {});
    expect(isCorrect).toBe(false);
    // Non-winning: letters shown as typed by user, not from solutionArr
    expect(guessEvaluation[3].letter).toBe('C'); // typed C, NOT Ç
  });

  it('updates usedLetters with correct status', () => {
    const { newUsedLetters } = checkGuess('BANCO', 'BANCO', {});
    expect(newUsedLetters['B']).toBe('correct');
    expect(newUsedLetters['A']).toBe('correct');
    expect(newUsedLetters['N']).toBe('correct');
  });

  it('updates usedLetters with present status', () => {
    // O is in BANCO (pos 4); guess OTURFE — O is present
    const { newUsedLetters } = checkGuess('OTURFE'.slice(0, 5), 'BANCO', {});
    // OTURF vs BANCO: O present (in sol but pos 0≠pos 4), T absent, U absent, R absent, F absent
    const { newUsedLetters: ul } = checkGuess('OTURF', 'BANCO', {});
    expect(ul['O']).toBe('present');
    expect(ul['T']).toBe('absent');
  });

  it('respects priority correct > present > absent in usedLetters', () => {
    // First guess has B absent (no match), second guess has B correct
    const { newUsedLetters: after1 } = checkGuess('TURFE', 'BANCO', {}); // B not in TURFE
    expect(after1['T']).toBe('absent');
    // Second guess: B is correct now
    const { newUsedLetters: after2 } = checkGuess('BANCO', 'BANCO', after1);
    expect(after2['B']).toBe('correct');
    // Once correct, should not be downgraded
    const { newUsedLetters: after3 } = checkGuess('TURFE', 'BANCO', after2);
    // B not in TURFE, but after2.B is already 'correct', so it stays correct
    expect(after3['B']).toBe('correct');
  });

  it('uses normalized keys in usedLetters (A-Z, no accents)', () => {
    // Solution has Ç — keyboard key should be C (normalized)
    const { newUsedLetters } = checkGuess('GRACA', 'GRAÇA', {});
    // Ç normalizes to C; key in usedLetters should be 'C'
    expect(newUsedLetters['C']).toBe('correct');
    expect(newUsedLetters['Ç']).toBeUndefined();
  });
});

// ─── getTileStyling ────────────────────────────────────────────────────────────

describe('getTileStyling', () => {
  it('returns correct class for each evaluation status', () => {
    expect(getTileStyling('correct', false, true)).toBe('tile-correct');
    expect(getTileStyling('present', false, true)).toBe('tile-present');
    expect(getTileStyling('absent', false, true)).toBe('tile-absent');
  });

  it('returns active class when tile is focused (no status)', () => {
    expect(getTileStyling(null, true, false)).toBe('tile-active');
    expect(getTileStyling(undefined, true, true)).toBe('tile-active');
  });

  it('returns filled class when tile has a letter but no focus or status', () => {
    expect(getTileStyling(null, false, true)).toBe('tile-filled');
    expect(getTileStyling(undefined, false, true)).toBe('tile-filled');
  });

  it('returns empty class for blank unfocused tile', () => {
    expect(getTileStyling(null, false, false)).toBe('tile-empty');
    expect(getTileStyling(undefined, false, false)).toBe('tile-empty');
  });

  it('status takes priority over focus', () => {
    // Submitted tile with status — focus state is irrelevant
    expect(getTileStyling('correct', true, true)).toBe('tile-correct');
    expect(getTileStyling('absent', true, true)).toBe('tile-absent');
  });
});

// ─── getKeyboardKeyColor ───────────────────────────────────────────────────────

describe('getKeyboardKeyColor', () => {
  const usedLetters = { A: 'correct', B: 'present', C: 'absent' };

  it('returns the right color class for each status', () => {
    expect(getKeyboardKeyColor('A', usedLetters)).toBe('key-correct');
    expect(getKeyboardKeyColor('B', usedLetters)).toBe('key-present');
    expect(getKeyboardKeyColor('C', usedLetters)).toBe('key-absent');
  });

  it('returns default for letters not yet used', () => {
    expect(getKeyboardKeyColor('Z', usedLetters)).toBe('key-default');
    expect(getKeyboardKeyColor('M', {})).toBe('key-default');
  });
});
