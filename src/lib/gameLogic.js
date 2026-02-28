
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
  const guessArr = guess.split('');
  const statuses = Array(WORD_LENGTH).fill('absent');

  // Contagem de letras disponíveis na solução para o passo 2
  const available = {};
  for (const letter of solution) {
    available[letter] = (available[letter] || 0) + 1;
  }

  // Passagem 1: marcar corretos (verde) e descontar do disponível
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === solution[i]) {
      statuses[i] = 'correct';
      available[guessArr[i]]--;
    }
  }

  // Passagem 2: marcar presentes (amarelo) apenas se ainda houver ocorrências
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (statuses[i] === 'correct') continue;
    if (available[guessArr[i]] > 0) {
      statuses[i] = 'present';
      available[guessArr[i]]--;
    }
  }

  const guessEvaluation = guessArr.map((letter, i) => ({ letter, status: statuses[i] }));
  const isCorrect = statuses.every(s => s === 'correct');

  // Atualizar teclado — prioridade: correct > present > absent
  for (let i = 0; i < WORD_LENGTH; i++) {
    const letter = guessArr[i];
    const status = statuses[i];
    if (status === 'correct') {
      newUsedLetters[letter] = 'correct';
    } else if (status === 'present' && newUsedLetters[letter] !== 'correct') {
      newUsedLetters[letter] = 'present';
    } else if (status === 'absent' && !newUsedLetters[letter]) {
      newUsedLetters[letter] = 'absent';
    }
  }

  return { newUsedLetters, isCorrect, guessEvaluation };
};
