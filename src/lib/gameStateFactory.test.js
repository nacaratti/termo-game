import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState } from './gameStateFactory';

beforeEach(() => {
  localStorage.clear();
});

const base = {
  dateStr: '2026-03-10',
  solution: 'KINTO',
  guesses: ['TURFE', null, null, null, null, null],
  submittedGuessesInfo: [[{ letter: 'T', status: 'absent' }], null, null, null, null, null],
  currentAttempt: 1,
};

// ─── Interface ─────────────────────────────────────────────────────────────────

describe('createGameState', () => {
  it('retorna objeto com as quatro funções esperadas', () => {
    const gs = createGameState('_test_key');
    expect(typeof gs.saveGameProgress).toBe('function');
    expect(typeof gs.saveCompletedGame).toBe('function');
    expect(typeof gs.getSavedGame).toBe('function');
    expect(typeof gs.getCompletedGame).toBe('function');
  });
});

// ─── saveGameProgress + getSavedGame ──────────────────────────────────────────

describe('saveGameProgress + getSavedGame', () => {
  it('salva e restaura o estado de um jogo em andamento', () => {
    const gs = createGameState('_test_key');
    gs.saveGameProgress(base);
    const saved = gs.getSavedGame(base.dateStr, base.solution);
    expect(saved).not.toBeNull();
    expect(saved.isGameOver).toBe(false);
    expect(saved.isGameWon).toBe(false);
    expect(saved.solution).toBe('KINTO');
    expect(saved.currentAttempt).toBe(1);
    expect(saved.guesses[0]).toBe('TURFE');
  });

  it('retorna null quando a data não corresponde', () => {
    const gs = createGameState('_test_key');
    gs.saveGameProgress(base);
    expect(gs.getSavedGame('2020-01-01', base.solution)).toBeNull();
  });

  it('retorna null quando a solução não corresponde', () => {
    const gs = createGameState('_test_key');
    gs.saveGameProgress(base);
    expect(gs.getSavedGame(base.dateStr, 'OUTRA')).toBeNull();
  });

  it('sobrescreve o progresso anterior', () => {
    const gs = createGameState('_test_key');
    gs.saveGameProgress(base);
    gs.saveGameProgress({ ...base, currentAttempt: 3 });
    const saved = gs.getSavedGame(base.dateStr, base.solution);
    expect(saved.currentAttempt).toBe(3);
  });
});

// ─── saveCompletedGame ────────────────────────────────────────────────────────

describe('saveCompletedGame + getSavedGame', () => {
  it('salva jogo concluído com vitória', () => {
    const gs = createGameState('_test_key');
    gs.saveCompletedGame({ ...base, isGameWon: true });
    const saved = gs.getSavedGame(base.dateStr, base.solution);
    expect(saved.isGameOver).toBe(true);
    expect(saved.isGameWon).toBe(true);
  });

  it('salva jogo concluído com derrota', () => {
    const gs = createGameState('_test_key');
    gs.saveCompletedGame({ ...base, isGameWon: false });
    const saved = gs.getSavedGame(base.dateStr, base.solution);
    expect(saved.isGameOver).toBe(true);
    expect(saved.isGameWon).toBe(false);
  });
});

// ─── getCompletedGame ─────────────────────────────────────────────────────────

describe('getCompletedGame', () => {
  it('retorna o jogo salvo quando a data confere', () => {
    const gs = createGameState('_test_key');
    gs.saveCompletedGame({ ...base, isGameWon: true });
    const saved = gs.getCompletedGame(base.dateStr);
    expect(saved).not.toBeNull();
    expect(saved.solution).toBe('KINTO');
  });

  it('retorna null para data diferente', () => {
    const gs = createGameState('_test_key');
    gs.saveCompletedGame({ ...base, isGameWon: true });
    expect(gs.getCompletedGame('2020-01-01')).toBeNull();
  });

  it('retorna null quando localStorage está vazio', () => {
    const gs = createGameState('_test_key');
    expect(gs.getCompletedGame(base.dateStr)).toBeNull();
  });
});

// ─── Isolamento entre instâncias ──────────────────────────────────────────────

describe('isolamento entre instâncias com chaves diferentes', () => {
  it('duas instâncias com chaves distintas não interferem entre si', () => {
    const gs5 = createGameState('_state5');
    const gs6 = createGameState('_state6');

    gs5.saveGameProgress({ ...base, solution: 'CINCO' });
    gs6.saveGameProgress({ ...base, solution: 'SEIS12' });

    expect(gs5.getSavedGame(base.dateStr, 'CINCO')).not.toBeNull();
    expect(gs6.getSavedGame(base.dateStr, 'SEIS12')).not.toBeNull();
    // chave errada retorna null
    expect(gs5.getSavedGame(base.dateStr, 'SEIS12')).toBeNull();
    expect(gs6.getSavedGame(base.dateStr, 'CINCO')).toBeNull();
  });

  it('limpar uma instância não afeta a outra', () => {
    const gs5 = createGameState('_state5');
    const gs6 = createGameState('_state6');

    gs5.saveGameProgress({ ...base, solution: 'CINCO' });
    gs6.saveGameProgress({ ...base, solution: 'SEIS12' });

    localStorage.removeItem('_state5');
    expect(gs5.getSavedGame(base.dateStr, 'CINCO')).toBeNull();
    expect(gs6.getSavedGame(base.dateStr, 'SEIS12')).not.toBeNull();
  });
});
