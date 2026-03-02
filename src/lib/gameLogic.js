
import { WORD_LENGTH } from '@/config/constants';
import { normalizeLetter } from '@/lib/normalize';

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

export const getTileStyling = (status, hasFocus, hasLetter) => {
  if (status === 'correct') return 'tile-correct';
  if (status === 'present') return 'tile-present';
  if (status === 'absent')  return 'tile-absent';
  if (hasFocus)   return 'tile-active';
  if (hasLetter)  return 'tile-filled';
  return 'tile-empty';
};


export const getKeyboardKeyColor = (key, usedLetters) => {
  if (usedLetters[key] === 'correct') return 'key-correct';
  if (usedLetters[key] === 'present') return 'key-present';
  if (usedLetters[key] === 'absent') return 'key-absent';
  return 'key-default';
};

export const checkGuess = (guess, solution, currentUsedLetters) => {
  const newUsedLetters = { ...currentUsedLetters };
  const guessArr = guess.split('');
  const solutionArr = solution.split('');
  const statuses = Array(WORD_LENGTH).fill('absent');

  // Comparações sempre usam letras normalizadas (sem acento/ç)
  // para que GRACA bata com GRAÇA, ACAO bata com AÇÃO, etc.
  const normGuess    = guessArr.map(normalizeLetter);
  const normSolution = solutionArr.map(normalizeLetter);

  // Contagem de letras disponíveis na solução (formas normalizadas)
  const available = {};
  for (const nl of normSolution) {
    available[nl] = (available[nl] || 0) + 1;
  }

  // Passagem 1: corretos (posição + letra batem)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (normGuess[i] === normSolution[i]) {
      statuses[i] = 'correct';
      available[normGuess[i]]--;
    }
  }

  // Passagem 2: presentes (letra existe mas em posição errada)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (statuses[i] === 'correct') continue;
    if (available[normGuess[i]] > 0) {
      statuses[i] = 'present';
      available[normGuess[i]]--;
    }
  }

  // Para tiles corretos (verde), exibe a letra canônica da solução (ex: Ç em vez de C).
  // Para tiles presentes/ausentes, mantém a letra digitada.
  const guessEvaluation = guessArr.map((letter, i) => ({
    letter: statuses[i] === 'correct' ? solutionArr[i] : letter,
    status: statuses[i],
  }));
  const isCorrect = statuses.every(s => s === 'correct');

  // Teclado usa a letra normalizada (A-Z) — prioridade: correct > present > absent
  for (let i = 0; i < WORD_LENGTH; i++) {
    const key    = normGuess[i]; // letra do teclado (A-Z)
    const status = statuses[i];
    if (status === 'correct') {
      newUsedLetters[key] = 'correct';
    } else if (status === 'present' && newUsedLetters[key] !== 'correct') {
      newUsedLetters[key] = 'present';
    } else if (status === 'absent' && !newUsedLetters[key]) {
      newUsedLetters[key] = 'absent';
    }
  }

  return { newUsedLetters, isCorrect, guessEvaluation };
};
