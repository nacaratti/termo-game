import { VALID_WORDS_6_SET } from '@/data/wordList6';
import { normalizeWord } from '@/lib/normalize';

const _K6  = '_c4w6';
const _BK6 = '_b6w';

const _readCustom = () => {
  try { return JSON.parse(atob(localStorage.getItem(_K6) || '')); } catch { return []; }
};
const _writeCustom = (arr) => {
  try { localStorage.setItem(_K6, btoa(JSON.stringify(arr))); } catch {}
};

const _readBL = () => {
  try { return new Set(JSON.parse(atob(localStorage.getItem(_BK6) || ''))); } catch { return new Set(); }
};
const _writeBL = (set) => {
  try { localStorage.setItem(_BK6, btoa(JSON.stringify([...set]))); } catch {}
};

export const getCustomWords6 = () => _readCustom();

export const addCustomWord6 = (word) => {
  const upper = word.toUpperCase().trim();
  if (upper.length !== 6) return { ok: false, reason: 'A palavra deve ter exatamente 6 letras.' };
  if (!/^[A-Z]+$/.test(upper)) return { ok: false, reason: 'Use apenas letras sem acentos.' };
  if (VALID_WORDS_6_SET.has(upper)) return { ok: false, reason: 'Esta palavra já está no banco de dados.' };
  const current = _readCustom();
  if (current.includes(upper)) return { ok: false, reason: 'Esta palavra já foi adicionada.' };
  _writeCustom([...current, upper]);
  return { ok: true };
};

export const removeCustomWord6 = (word) => {
  _writeCustom(_readCustom().filter(w => w !== word));
};

export const getBlacklist6 = () => [..._readBL()];

export const addToBlacklist6 = (word) => {
  const bl = _readBL();
  bl.add(normalizeWord(word.toUpperCase()));
  _writeBL(bl);
};

export const removeFromBlacklist6 = (word) => {
  const bl = _readBL();
  bl.delete(normalizeWord(word.toUpperCase()));
  _writeBL(bl);
};

export const isValidGuess6 = (word) => {
  const norm = normalizeWord(word);
  if (_readBL().has(norm)) return false;
  return VALID_WORDS_6_SET.has(norm) || _readCustom().includes(word.toUpperCase());
};
