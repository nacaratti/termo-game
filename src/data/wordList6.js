import rawValidas6 from '../../palavras/validas_6.txt?raw';
import { normalizeWord } from '@/lib/normalize';

const parse6 = (raw) =>
  raw.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 6);

export const VALID_WORDS_6_SET = new Set(parse6(rawValidas6).map(normalizeWord));
