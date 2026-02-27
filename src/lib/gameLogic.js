
import { WORD_LENGTH } from '@/config/constants';

export const getRandomWord = (words, exclude = '') => {
  const pool = exclude ? words.filter(w => w !== exclude) : words;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const getWordOfTheDay = (wordList) => {
  const startDate = new Date(2025, 0, 1); 
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return wordList[diffDays % wordList.length].toUpperCase();
};

export const getTileStatus = (letter, index, solution) => {
  if (solution[index] === letter) return 'correct';
  if (solution.includes(letter)) return 'present';
  return 'absent';
};


export const getTileStyling = (status, hasFocus) => {
  if (status === 'correct') return 'tile-correct bg-green-500 border-green-400 text-white';
  if (status === 'present') return 'tile-present bg-yellow-500 border-yellow-400 text-white';
  if (status === 'absent') return 'tile-absent bg-slate-500 border-slate-400 text-white opacity-80';
  
  return hasFocus ? 'tile-active bg-slate-600 border-primary' : 'tile-empty bg-slate-700 border-slate-600';
};


export const getKeyboardKeyColor = (key, usedLetters) => {
  if (usedLetters[key] === 'correct') return 'key-correct';
  if (usedLetters[key] === 'present') return 'key-present';
  if (usedLetters[key] === 'absent') return 'key-absent';
  return 'key-default';
};

export const checkGuess = (guess, solution, currentUsedLetters) => {
  const newUsedLetters = { ...currentUsedLetters };
  let isCorrect = true;
  const guessEvaluation = Array(WORD_LENGTH).fill(null);

  guess.split('').forEach((letter, index) => {
    const status = getTileStatus(letter, index, solution);
    guessEvaluation[index] = { letter, status };

    if (status === 'correct') {
      newUsedLetters[letter] = 'correct';
    } else if (status === 'present') {
      isCorrect = false;
      if (newUsedLetters[letter] !== 'correct') {
        newUsedLetters[letter] = 'present';
      }
    } else {
      isCorrect = false;
      if (!newUsedLetters[letter]) {
        newUsedLetters[letter] = 'absent';
      }
    }
  });
  return { newUsedLetters, isCorrect, guessEvaluation };
};
