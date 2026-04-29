import { VALID_WORDS_6_SET } from '@/data/wordList6';
import { normalizeWord } from '@/lib/normalize';

export const isValidGuess6 = (word) =>
  VALID_WORDS_6_SET.has(normalizeWord(word));
