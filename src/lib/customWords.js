import { VALID_WORDS_SET } from '@/data/wordList';
import { createCustomWords } from './customWordsFactory';

const {
  getCustomWords,
  addCustomWord,
  removeCustomWord,
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  isValidGuess,
} = createCustomWords('_c4w', '_b5w', 5, VALID_WORDS_SET);

export { getCustomWords, addCustomWord, removeCustomWord, getBlacklist, addToBlacklist, removeFromBlacklist, isValidGuess };
