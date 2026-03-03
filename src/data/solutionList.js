// Este arquivo é carregado APENAS pelo painel admin (lazy import).
// Nunca deve ser importado pelo código do jogo principal.
import rawSolucoes from '../../palavras/solucoes.txt?raw';

const parseLines = (raw) =>
  raw.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);

export const SOLUTION_WORDS = parseLines(rawSolucoes);
