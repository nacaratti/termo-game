import { normalizeWord } from '@/lib/normalize';

export const createCustomWords = (storageKey, blacklistKey, wordLength, validWordsSet) => {
  const _read = () => {
    try { return JSON.parse(atob(localStorage.getItem(storageKey) || '')); } catch { return []; }
  };
  const _write = (arr) => {
    try { localStorage.setItem(storageKey, btoa(JSON.stringify(arr))); } catch {}
  };
  const _readBL = () => {
    try { return new Set(JSON.parse(atob(localStorage.getItem(blacklistKey) || ''))); } catch { return new Set(); }
  };
  const _writeBL = (set) => {
    try { localStorage.setItem(blacklistKey, btoa(JSON.stringify([...set]))); } catch {}
  };

  const getCustomWords = () => _read();

  const addCustomWord = (word) => {
    const upper = word.toUpperCase().trim();
    if (upper.length !== wordLength) return { ok: false, reason: `A palavra deve ter exatamente ${wordLength} letras.` };
    if (!/^[A-Z]+$/.test(upper)) return { ok: false, reason: 'Use apenas letras sem acentos.' };
    if (validWordsSet.has(upper)) return { ok: false, reason: 'Esta palavra já está no banco de dados.' };
    const current = _read();
    if (current.includes(upper)) return { ok: false, reason: 'Esta palavra já foi adicionada.' };
    _write([...current, upper]);
    return { ok: true };
  };

  const removeCustomWord = (word) => {
    _write(_read().filter(w => w !== word));
  };

  const getBlacklist = () => [..._readBL()];

  const addToBlacklist = (word) => {
    const bl = _readBL();
    bl.add(normalizeWord(word.toUpperCase()));
    _writeBL(bl);
  };

  const removeFromBlacklist = (word) => {
    const bl = _readBL();
    bl.delete(normalizeWord(word.toUpperCase()));
    _writeBL(bl);
  };

  const isValidGuess = (word) => {
    const norm = normalizeWord(word);
    if (_readBL().has(norm)) return false;
    return validWordsSet.has(norm) || _read().includes(word.toUpperCase());
  };

  return { getCustomWords, addCustomWord, removeCustomWord, getBlacklist, addToBlacklist, removeFromBlacklist, isValidGuess };
};
