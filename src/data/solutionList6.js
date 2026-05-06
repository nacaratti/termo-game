// Carregado APENAS pelo painel admin — nunca importar no código do jogo principal.
import rawSolucoes6 from '../../palavras/solucoes_6.txt?raw';

export const SOLUTION_WORDS_6 = rawSolucoes6
  .split('\n')
  .map(w => w.trim().toUpperCase())
  .filter(w => w.length === 6);
