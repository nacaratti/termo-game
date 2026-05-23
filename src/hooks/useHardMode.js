import { useState } from 'react';

const HM_KEY = '_hm';

export function useHardMode() {
  const [hardMode, setHardModeState] = useState(() => {
    try { return localStorage.getItem(HM_KEY) === '1'; } catch { return false; }
  });

  const setHardMode = (val) => {
    setHardModeState(val);
    try { localStorage.setItem(HM_KEY, val ? '1' : '0'); } catch {}
  };

  return { hardMode, setHardMode };
}

/**
 * Validates a guess against hard mode constraints derived from past evaluations.
 * Returns { valid: true } or { valid: false, message: string }.
 */
export function validateHardModeGuess(guess, submittedGuessesInfo) {
  const guessArr = [...guess.toUpperCase()];

  for (const row of submittedGuessesInfo) {
    if (!row) continue;

    // Correct (green): same letter at same position
    for (let i = 0; i < row.length; i++) {
      const { letter, status } = row[i];
      if (status === 'correct' && guessArr[i] !== letter) {
        return { valid: false, message: `Posição ${i + 1} deve ser "${letter}"` };
      }
    }

    // Present (yellow): letter must appear somewhere
    for (const { letter, status } of row) {
      if (status === 'present' && !guessArr.includes(letter)) {
        return { valid: false, message: `"${letter}" deve estar na palavra` };
      }
    }
  }

  return { valid: true };
}
