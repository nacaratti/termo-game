const _K6 = '_p3q6';

const _save = (data) => {
  try { localStorage.setItem(_K6, btoa(JSON.stringify(data))); } catch {}
};
const _load = () => {
  try { return JSON.parse(atob(localStorage.getItem(_K6) || '')); } catch { return null; }
};

export const saveGameProgress6 = ({ dateStr, solution, guesses, submittedGuessesInfo, currentAttempt }) =>
  _save({ date: dateStr, solution, guesses, submittedGuessesInfo, isGameWon: false, isGameOver: false, currentAttempt });

export const saveCompletedGame6 = ({ dateStr, solution, guesses, submittedGuessesInfo, isGameWon, currentAttempt }) =>
  _save({ date: dateStr, solution, guesses, submittedGuessesInfo, isGameWon, isGameOver: true, currentAttempt });

export const getSavedGame6 = (dateStr, solution) => {
  const stored = _load();
  return stored?.date === dateStr && stored.solution === solution ? stored : null;
};
