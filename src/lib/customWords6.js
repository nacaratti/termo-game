import { VALID_WORDS_6_SET } from '@/data/wordList6';
import { createCustomWords } from './customWordsFactory';

const {
  getCustomWords: getCustomWords6,
  addCustomWord: addCustomWord6,
  removeCustomWord: removeCustomWord6,
  getBlacklist: getBlacklist6,
  addToBlacklist: addToBlacklist6,
  removeFromBlacklist: removeFromBlacklist6,
  isValidGuess: isValidGuess6,
} = createCustomWords('_c4w6', '_b6w', 6, VALID_WORDS_6_SET);

export { getCustomWords6, addCustomWord6, removeCustomWord6, getBlacklist6, addToBlacklist6, removeFromBlacklist6, isValidGuess6 };
