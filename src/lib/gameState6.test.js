import { describe, it, expect, beforeEach } from 'vitest';
import { saveGameProgress6, saveCompletedGame6, getSavedGame6 } from './gameState6';

beforeEach(() => {
  localStorage.clear();
});

const base = {
  dateStr: '2026-03-04',
  solution: 'BRANCO',
  guesses: ['TURFEL', null, null, null, null, null, null],
  submittedGuessesInfo: [[{ letter: 'T', status: 'absent' }], null, null, null, null, null, null],
  currentAttempt: 0,
};

// ─── saveGameProgress6 ─────────────────────────────────────────────────────────

describe('saveGameProgress6 + getSavedGame6', () => {
  it('saves and restores in-progress game state', () => {
    saveGameProgress6(base);
    const saved = getSavedGame6(base.dateStr, base.solution);
    expect(saved).not.toBeNull();
    expect(saved.isGameOver).toBe(false);
    expect(saved.isGameWon).toBe(false);
    expect(saved.solution).toBe('BRANCO');
    expect(saved.currentAttempt).toBe(0);
    expect(saved.guesses[0]).toBe('TURFEL');
  });

  it('returns null when date does not match', () => {
    saveGameProgress6(base);
    expect(getSavedGame6('2026-03-03', base.solution)).toBeNull();
    expect(getSavedGame6('2020-01-01', base.solution)).toBeNull();
  });

  it('returns null when solution does not match', () => {
    saveGameProgress6(base);
    expect(getSavedGame6(base.dateStr, 'OUTRAA')).toBeNull();
    expect(getSavedGame6(base.dateStr, 'branco')).toBeNull(); // case-sensitive
  });

  it('overwrites previous progress when called again', () => {
    saveGameProgress6(base);
    saveGameProgress6({ ...base, currentAttempt: 3 });
    const saved = getSavedGame6(base.dateStr, base.solution);
    expect(saved.currentAttempt).toBe(3);
  });

  it('does not interfere with 5-letter game state (different localStorage key)', () => {
    // Each module uses its own key; saving 6-letter state should not touch _p3q
    saveGameProgress6(base);
    expect(localStorage.getItem('_p3q')).toBeNull();
  });
});

// ─── saveCompletedGame6 ────────────────────────────────────────────────────────

describe('saveCompletedGame6 + getSavedGame6', () => {
  it('saves completed won game with isGameOver true', () => {
    saveCompletedGame6({ ...base, isGameWon: true });
    const saved = getSavedGame6(base.dateStr, base.solution);
    expect(saved).not.toBeNull();
    expect(saved.isGameOver).toBe(true);
    expect(saved.isGameWon).toBe(true);
  });

  it('saves completed lost game with isGameWon false', () => {
    saveCompletedGame6({ ...base, isGameWon: false });
    const saved = getSavedGame6(base.dateStr, base.solution);
    expect(saved.isGameOver).toBe(true);
    expect(saved.isGameWon).toBe(false);
  });

  it('preserves all game fields across roundtrip', () => {
    saveCompletedGame6({ ...base, isGameWon: true, currentAttempt: 5 });
    const saved = getSavedGame6(base.dateStr, base.solution);
    expect(saved.currentAttempt).toBe(5);
    expect(saved.guesses[0]).toBe('TURFEL');
    expect(saved.submittedGuessesInfo[0][0].status).toBe('absent');
  });

  it('returns null when getSavedGame6 is called with wrong date after save', () => {
    saveCompletedGame6({ ...base, isGameWon: true });
    expect(getSavedGame6('9999-01-01', base.solution)).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(getSavedGame6(base.dateStr, base.solution)).toBeNull();
  });
});
