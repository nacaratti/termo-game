// Chave interna — propositalmente não descritiva
const _K = '_p3q';

const _save = (data) => {
  try { localStorage.setItem(_K, btoa(JSON.stringify(data))); } catch { /* ignore */ }
};

const _load = () => {
  try { return JSON.parse(atob(localStorage.getItem(_K) || '')); } catch { return null; }
};

/**
 * Salva o progresso de um jogo em andamento (ainda não terminado).
 * currentAttempt = índice da última tentativa enviada (0-based).
 */
export const saveGameProgress = ({ dateStr, solution, guesses, submittedGuessesInfo, currentAttempt }) => {
  _save({ date: dateStr, solution, guesses, submittedGuessesInfo, isGameWon: false, isGameOver: false, currentAttempt });
};

/**
 * Salva o estado de um jogo terminado (ganho ou perdido).
 */
export const saveCompletedGame = ({ dateStr, solution, guesses, submittedGuessesInfo, isGameWon, currentAttempt }) => {
  _save({ date: dateStr, solution, guesses, submittedGuessesInfo, isGameWon, isGameOver: true, currentAttempt });
};

/**
 * Retorna o estado salvo se for da data e palavra informadas, ou null.
 */
export const getSavedGame = (dateStr, solution) => {
  const stored = _load();
  if (stored && stored.date === dateStr && stored.solution === solution) return stored;
  return null;
};

/** Alias para compatibilidade. */
export const getCompletedGame = (dateStr) => {
  const stored = _load();
  if (stored && stored.date === dateStr) return stored;
  return null;
};
