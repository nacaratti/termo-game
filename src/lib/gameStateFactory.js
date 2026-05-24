export const createGameState = (storageKey) => {
  const _save = (data) => {
    try { localStorage.setItem(storageKey, btoa(JSON.stringify(data))); } catch { /* ignore */ }
  };

  const _load = () => {
    try { return JSON.parse(atob(localStorage.getItem(storageKey) || '')); } catch { return null; }
  };

  const saveGameProgress = ({ dateStr, solution, guesses, submittedGuessesInfo, currentAttempt }) =>
    _save({ date: dateStr, solution, guesses, submittedGuessesInfo, isGameWon: false, isGameOver: false, currentAttempt });

  const saveCompletedGame = ({ dateStr, solution, guesses, submittedGuessesInfo, isGameWon, currentAttempt }) =>
    _save({ date: dateStr, solution, guesses, submittedGuessesInfo, isGameWon, isGameOver: true, currentAttempt });

  const getSavedGame = (dateStr, solution) => {
    const stored = _load();
    return stored?.date === dateStr && stored.solution === solution ? stored : null;
  };

  const getCompletedGame = (dateStr) => {
    const stored = _load();
    return stored?.date === dateStr ? stored : null;
  };

  return { saveGameProgress, saveCompletedGame, getSavedGame, getCompletedGame };
};
