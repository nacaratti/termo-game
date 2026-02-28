const GAME_STATE_KEY = 'termo_game_state';

/**
 * Salva o estado completo de um jogo terminado para a data informada.
 * Impede que o jogador refaça o jogo no mesmo dia.
 */
export const saveCompletedGame = ({ dateStr, solution, guesses, submittedGuessesInfo, isGameWon, currentAttempt }) => {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify({
    date: dateStr,
    solution,
    guesses,
    submittedGuessesInfo,
    isGameWon,
    currentAttempt,
  }));
};

/**
 * Retorna o estado do jogo salvo se for do dia informado, ou null.
 */
export const getCompletedGame = (dateStr) => {
  try {
    const stored = JSON.parse(localStorage.getItem(GAME_STATE_KEY));
    if (stored && stored.date === dateStr) return stored;
  } catch { /* ignore */ }
  return null;
};
