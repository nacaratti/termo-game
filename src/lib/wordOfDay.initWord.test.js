import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/lib/supabase';
import { initWordOfDay, setWordOfDay } from './wordOfDay';

const makeOnlineSupabase = (wordForToday) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: wordForToday ? { word: wordForToday } : null,
    })),
    upsert: vi.fn(async () => ({})),
  };

  return {
    from: vi.fn(() => query),
  };
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('initWordOfDay com Supabase online', () => {
  it('retorna a palavra existente do Supabase em maiúsculas', async () => {
    const online = makeOnlineSupabase('banco');
    supabase.from.mockImplementation(online.from);

    const word = await initWordOfDay();

    expect(word).toBe('BANCO');
  });

  it('salva a palavra no cache e usa o cache quando o Supabase falha depois', async () => {
    const online = makeOnlineSupabase('termo');
    supabase.from.mockImplementation(online.from);

    const first = await initWordOfDay();
    expect(first).toBe('TERMO');

    supabase.from.mockImplementation(() => {
      throw new Error('offline');
    });

    const cached = await initWordOfDay();
    expect(cached).toBe('TERMO');
  });
});

describe('initWordOfDay fallback / offline', () => {
  it('quando o Supabase lança erro, retorna uma palavra de 5 letras e reutiliza o cache', async () => {
    supabase.from.mockImplementation(() => {
      throw new Error('offline');
    });

    const word = await initWordOfDay();
    expect(word).toMatch(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{5}$/i);
    expect(word).toHaveLength(5);

    const again = await initWordOfDay();
    expect(again).toBe(word);
  });

  it('usa a palavra definida por setWordOfDay quando o Supabase está indisponível', async () => {
    setWordOfDay('carro');

    supabase.from.mockImplementation(() => {
      throw new Error('offline');
    });

    const word = await initWordOfDay();
    expect(word).toBe('CARRO');
  });
});

