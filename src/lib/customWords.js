import { VALID_WORDS_SET } from '@/data/wordList';
import { normalizeWord } from '@/lib/normalize';

const _K  = '_c4w';
const _BK = '_b5w';

const _read = () => {
  try { return JSON.parse(atob(localStorage.getItem(_K) || '')); } catch { return []; }
};
const _write = (arr) => {
  try { localStorage.setItem(_K, btoa(JSON.stringify(arr))); } catch {}
};

const _readBL = () => {
  try { return new Set(JSON.parse(atob(localStorage.getItem(_BK) || ''))); } catch { return new Set(); }
};
const _writeBL = (set) => {
  try { localStorage.setItem(_BK, btoa(JSON.stringify([...set]))); } catch {}
};

export const getCustomWords = () => _read();

export const addCustomWord = (word) => {
  const upper = word.toUpperCase().trim();
  if (upper.length !== 5) return { ok: false, reason: 'A palavra deve ter exatamente 5 letras.' };
  if (!/^[A-Z]+$/.test(upper)) return { ok: false, reason: 'Use apenas letras sem acentos.' };
  if (VALID_WORDS_SET.has(upper)) return { ok: false, reason: 'Esta palavra já está no banco de dados.' };
  const current = _read();
  if (current.includes(upper)) return { ok: false, reason: 'Esta palavra já foi adicionada.' };
  _write([...current, upper]);
  return { ok: true };
};

export const removeCustomWord = (word) => {
  _write(_read().filter(w => w !== word));
};

export const getBlacklist = () => [..._readBL()];

export const addToBlacklist = (word) => {
  const bl = _readBL();
  bl.add(normalizeWord(word.toUpperCase()));
  _writeBL(bl);
};

export const removeFromBlacklist = (word) => {
  const bl = _readBL();
  bl.delete(normalizeWord(word.toUpperCase()));
  _writeBL(bl);
};

export const isValidGuess = (word) => {
  const norm = normalizeWord(word);
  if (_readBL().has(norm)) return false;
  return VALID_WORDS_SET.has(norm) || _read().includes(word.toUpperCase());
};
