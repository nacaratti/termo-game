import rawSolucoes from '../../palavras/solucoes.txt?raw';
import rawValidas  from '../../palavras/validas.txt?raw';
import { normalizeWord } from '@/lib/normalize';

const parseLines = (raw) =>
  raw.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);

// Palavras comuns (sorteadas como palavra do dia): ~2.100 palavras
export const SOLUTION_WORDS = parseLines(rawSolucoes);

// Todas as palavras válidas para aceitar palpites: ~21.800 palavras
// Set de formas normalizadas (sem acento/ç) para validação O(1)
export const VALID_WORDS_SET = new Set(parseLines(rawValidas).map(normalizeWord));
