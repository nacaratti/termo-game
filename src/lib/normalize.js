/**
 * Remove acentos e converte Ç → C para comparação de letras.
 * Exemplos: 'Ç' → 'C', 'Ã' → 'A', 'É' → 'E', 'Â' → 'A'
 *
 * Funciona para letras individuais e palavras inteiras.
 */
export const normalizeLetter = (letter) =>
  letter
    .toUpperCase()
    .normalize('NFD')                     // decompõe: Ç → C + cedilha
    .replace(/[\u0300-\u036f]/g, '');     // remove todos os diacríticos

export const normalizeWord = (word) =>
  word.split('').map(normalizeLetter).join('');
