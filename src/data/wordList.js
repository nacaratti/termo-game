// Apenas a lista de palavras válidas para aceitar palpites.
// SOLUTION_WORDS foi movido para solutionList.js (carregado só no admin).
import rawValidas from '../../palavras/validas.txt?raw';
import { normalizeWord } from '@/lib/normalize';

const parseLines = (raw) =>
  raw.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);

// Set de formas normalizadas para validação O(1)
export const VALID_WORDS_SET = new Set(parseLines(rawValidas).map(normalizeWord));
