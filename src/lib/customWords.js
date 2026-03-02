import { VALID_WORDS_SET } from '@/config/constants';
import { normalizeWord } from '@/lib/normalize';

const CUSTOM_KEY = 'termo_custom_words';

export const getCustomWords = () => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
  } catch {
    return [];
  }
};

export const addCustomWord = (word) => {
  const upper = word.toUpperCase().trim();
  if (upper.length !== 5) return { ok: false, reason: 'A palavra deve ter exatamente 5 letras.' };
  if (!/^[A-Z]+$/.test(upper)) return { ok: false, reason: 'Use apenas letras sem acentos.' };
  if (VALID_WORDS_SET.has(upper)) return { ok: false, reason: 'Esta palavra já está no banco de dados.' };
  const current = getCustomWords();
  if (current.includes(upper)) return { ok: false, reason: 'Esta palavra já foi adicionada.' };
  localStorage.setItem(CUSTOM_KEY, JSON.stringify([...current, upper]));
  return { ok: true };
};

export const removeCustomWord = (word) => {
  const updated = getCustomWords().filter(w => w !== word);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
};

export const isValidGuess = (word) => {
  // Aceita tanto a forma digitada (GRACA) quanto a canônica (GRAÇA),
  // pois VALID_WORDS_SET contém formas normalizadas.
  return VALID_WORDS_SET.has(normalizeWord(word)) || getCustomWords().includes(word);
};
