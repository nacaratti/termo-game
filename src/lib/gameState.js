const GAME_STATE_KEY = 'termo_game_state';

/**
 * Salva o progresso de um jogo em andamento (ainda não terminado).
 * currentAttempt = índice da última tentativa enviada (0-based).
 */
export const saveGameProgress = ({ dateStr, solution, guesses, submittedGuessesInfo, currentAttempt }) => {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify({
    date: dateStr,
    solution,
    guesses,
    submittedGuessesInfo,
    isGameWon: false,
    isGameOver: false,
    currentAttempt,
  }));
};

/**
 * Salva o estado de um jogo terminado (ganho ou perdido).
 */
export const saveCompletedGame = ({ dateStr, solution, guesses, submittedGuessesInfo, isGameWon, currentAttempt }) => {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify({
    date: dateStr,
    solution,
    guesses,
    submittedGuessesInfo,
    isGameWon,
    isGameOver: true,
    currentAttempt,
  }));
};

/**
 * Retorna o estado salvo se for da data e palavra informadas, ou null.
 * Cobre tanto jogos em andamento quanto terminados.
 */
export const getSavedGame = (dateStr, solution) => {
  try {
    const stored = JSON.parse(localStorage.getItem(GAME_STATE_KEY));
    if (stored && stored.date === dateStr && stored.solution === solution) return stored;
  } catch { /* ignore */ }
  return null;
};

/** Alias para compatibilidade com código existente. */
export const getCompletedGame = (dateStr) => {
  try {
    const stored = JSON.parse(localStorage.getItem(GAME_STATE_KEY));
    if (stored && stored.date === dateStr) return stored;
  } catch { /* ignore */ }
  return null;
};
