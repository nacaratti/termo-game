import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/lib/supabase';
import { initWordOfDay6, setWordOfDay6 } from './wordOfDay6';

const makeOnlineSupabase = (wordForToday) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: wordForToday ? { word: wordForToday } : null,
    })),
    upsert: vi.fn(async () => ({})),
  };
  return { from: vi.fn(() => query) };
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('initWordOfDay6 com Supabase online', () => {
  it('retorna a palavra existente do Supabase em maiúsculas', async () => {
    const online = makeOnlineSupabase('cavalo');
    supabase.from.mockImplementation(online.from);

    const word = await initWordOfDay6();
    expect(word).toBe('CAVALO');
  });

  it('salva a palavra no cache e usa o cache quando o Supabase falha depois', async () => {
    const online = makeOnlineSupabase('tapete');
    supabase.from.mockImplementation(online.from);

    const first = await initWordOfDay6();
    expect(first).toBe('TAPETE');

    supabase.from.mockImplementation(() => {
      throw new Error('offline');
    });

    const cached = await initWordOfDay6();
    expect(cached).toBe('TAPETE');
  });
});

describe('initWordOfDay6 fallback / offline', () => {
  it('quando o Supabase lança erro, retorna uma palavra de 6 letras e reutiliza o cache', async () => {
    supabase.from.mockImplementation(() => {
      throw new Error('offline');
    });

    const word = await initWordOfDay6();
    expect(word).toHaveLength(6);
    expect(word).toMatch(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{6}$/i);

    const again = await initWordOfDay6();
    expect(again).toBe(word);
  });

  it('usa a palavra definida por setWordOfDay6 quando o Supabase está indisponível', async () => {
    setWordOfDay6('barcos');

    supabase.from.mockImplementation(() => {
      throw new Error('offline');
    });

    const word = await initWordOfDay6();
    expect(word).toBe('BARCOS');
  });
});
