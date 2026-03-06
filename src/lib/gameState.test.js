import { describe, it, expect, beforeEach } from 'vitest';
import { saveGameProgress, saveCompletedGame, getSavedGame, getCompletedGame } from './gameState';

beforeEach(() => {
  localStorage.clear();
});

const base = {
  dateStr: '2026-03-04',
  solution: 'BANCO',
  guesses: ['TURFE', null, null, null, null, null],
  submittedGuessesInfo: [[{ letter: 'T', status: 'absent' }], null, null, null, null, null],
  currentAttempt: 0,
};

// ─── saveGameProgress ──────────────────────────────────────────────────────────

describe('saveGameProgress + getSavedGame', () => {
  it('saves and restores in-progress game state', () => {
    saveGameProgress(base);
    const saved = getSavedGame(base.dateStr, base.solution);
    expect(saved).not.toBeNull();
    expect(saved.isGameOver).toBe(false);
    expect(saved.isGameWon).toBe(false);
    expect(saved.solution).toBe('BANCO');
    expect(saved.currentAttempt).toBe(0);
    expect(saved.guesses[0]).toBe('TURFE');
  });

  it('returns null when date does not match', () => {
    saveGameProgress(base);
    expect(getSavedGame('2026-03-03', base.solution)).toBeNull();
    expect(getSavedGame('2020-01-01', base.solution)).toBeNull();
  });

  it('returns null when solution does not match', () => {
    saveGameProgress(base);
    expect(getSavedGame(base.dateStr, 'OUTRA')).toBeNull();
    expect(getSavedGame(base.dateStr, 'banco')).toBeNull(); // case-sensitive
  });

  it('overwrites previous progress when called again', () => {
    saveGameProgress(base);
    saveGameProgress({ ...base, currentAttempt: 2 });
    const saved = getSavedGame(base.dateStr, base.solution);
    expect(saved.currentAttempt).toBe(2);
  });
});

// ─── saveCompletedGame ─────────────────────────────────────────────────────────

describe('saveCompletedGame + getSavedGame', () => {
  it('saves completed won game with isGameOver true', () => {
    saveCompletedGame({ ...base, isGameWon: true });
    const saved = getSavedGame(base.dateStr, base.solution);
    expect(saved).not.toBeNull();
    expect(saved.isGameOver).toBe(true);
    expect(saved.isGameWon).toBe(true);
  });

  it('saves completed lost game with isGameWon false', () => {
    saveCompletedGame({ ...base, isGameWon: false });
    const saved = getSavedGame(base.dateStr, base.solution);
    expect(saved.isGameOver).toBe(true);
    expect(saved.isGameWon).toBe(false);
  });

  it('preserves all game fields across roundtrip', () => {
    saveCompletedGame({ ...base, isGameWon: true, currentAttempt: 3 });
    const saved = getSavedGame(base.dateStr, base.solution);
    expect(saved.currentAttempt).toBe(3);
    expect(saved.guesses[0]).toBe('TURFE');
    expect(saved.submittedGuessesInfo[0][0].status).toBe('absent');
  });
});

// ─── getCompletedGame (alias) ──────────────────────────────────────────────────

describe('getCompletedGame', () => {
  it('returns the saved game when date matches', () => {
    saveCompletedGame({ ...base, isGameWon: true });
    const saved = getCompletedGame(base.dateStr);
    expect(saved).not.toBeNull();
    expect(saved.solution).toBe('BANCO');
  });

  it('returns null for a different date', () => {
    saveCompletedGame({ ...base, isGameWon: true });
    expect(getCompletedGame('2026-01-01')).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(getCompletedGame(base.dateStr)).toBeNull();
  });
});
