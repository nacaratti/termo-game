import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/lib/supabase';
import { submitComment, hasSubmittedComment, getComments, getCommentsByWord } from './comments';

const makeInsert = (error = null) => ({
  insert: vi.fn(async () => ({ error })),
});

const makeSelectChain = (data = [], error = null) => {
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    limit: vi.fn(async () => ({ data, error })),
  };
  return q;
};

const makeSelectChainEndOnOrder = (data = [], error = null) => {
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(async () => ({ data, error })),
  };
  return q;
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ─── submitComment (com supabase disponível) ──────────────────────────────────

describe('submitComment (com supabase disponível)', () => {
  it('retorna { ok: false, error: "empty" } para comentário em branco', async () => {
    supabase.from.mockImplementation(() => {
      throw new Error('não deveria chamar o supabase');
    });
    const result = await submitComment({
      dateStr: '2026-05-11', word: 'CARRO', mode: '5',
      comment: '   ', won: true, attempts: 3,
    });
    expect(result).toEqual({ ok: false, error: 'empty' });
  });

  it('retorna { ok: true } e marca como enviado em caso de sucesso', async () => {
    supabase.from.mockImplementation(() => makeInsert(null));
    const result = await submitComment({
      dateStr: '2026-05-11', word: 'carro', mode: '5',
      comment: 'Ótima palavra!', won: true, attempts: 3,
    });
    expect(result).toEqual({ ok: true });
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(true);
  });

  it('envia a palavra em maiúsculas e trimma o comentário', async () => {
    const insertFn = vi.fn(async () => ({ error: null }));
    supabase.from.mockImplementation(() => ({ insert: insertFn }));
    await submitComment({
      dateStr: '2026-05-11', word: 'carro', mode: '5',
      comment: '  Muito bom!  ', won: false, attempts: 6,
    });
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      word: 'CARRO',
      comment: 'Muito bom!',
    }));
  });

  it('trunca o comentário para no máximo 300 caracteres', async () => {
    const insertFn = vi.fn(async () => ({ error: null }));
    supabase.from.mockImplementation(() => ({ insert: insertFn }));
    const longo = 'x'.repeat(400);
    await submitComment({
      dateStr: '2026-05-11', word: 'CARRO', mode: '5',
      comment: longo, won: true, attempts: 1,
    });
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      comment: 'x'.repeat(300),
    }));
  });

  it('retorna { ok: false, error } quando o Supabase retorna erro e não marca como enviado', async () => {
    supabase.from.mockImplementation(() => makeInsert({ message: 'violação de constraint' }));
    const result = await submitComment({
      dateStr: '2026-05-11', word: 'CARRO', mode: '5',
      comment: 'Boa!', won: true, attempts: 2,
    });
    expect(result).toEqual({ ok: false, error: 'violação de constraint' });
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(false);
  });

  it('poda as entradas mais antigas quando _markSubmitted ultrapassa 30 chaves', async () => {
    const existing = {};
    for (let i = 1; i <= 30; i++) {
      existing[`2026-05-${String(i).padStart(2, '0')}|5`] = true;
    }
    localStorage.setItem('_cmt_submitted', JSON.stringify(existing));

    supabase.from.mockImplementation(() => makeInsert(null));
    await submitComment({
      dateStr: '2026-06-01', word: 'TESTE', mode: '5',
      comment: 'Ok', won: true, attempts: 3,
    });

    const stored = JSON.parse(localStorage.getItem('_cmt_submitted') || '{}');
    expect(Object.keys(stored).length).toBe(30);
    expect(stored['2026-06-01|5']).toBe(true);
    expect(stored['2026-05-01|5']).toBeUndefined();
  });
});

// ─── getComments ──────────────────────────────────────────────────────────────

describe('getComments', () => {
  it('retorna array de comentários em caso de sucesso', async () => {
    const comentarios = [{ id: 1, comment: 'Boa!' }, { id: 2, comment: 'Fácil' }];
    supabase.from.mockImplementation(() => makeSelectChain(comentarios));
    const result = await getComments(10);
    expect(result).toEqual(comentarios);
  });

  it('retorna [] quando o Supabase retorna erro', async () => {
    supabase.from.mockImplementation(() => makeSelectChain(null, { message: 'erro' }));
    const result = await getComments();
    expect(result).toEqual([]);
  });

  it('retorna [] quando data é null sem erro', async () => {
    supabase.from.mockImplementation(() => makeSelectChain(null, null));
    const result = await getComments();
    expect(result).toEqual([]);
  });
});

// ─── getCommentsByWord ────────────────────────────────────────────────────────

describe('getCommentsByWord', () => {
  it('retorna comentários filtrados e converte word para maiúsculas', async () => {
    const comentarios = [{ id: 1, word: 'CARRO', date: '2026-05-11' }];
    const q = makeSelectChainEndOnOrder(comentarios);
    supabase.from.mockImplementation(() => q);

    const result = await getCommentsByWord('2026-05-11', 'carro');
    expect(result).toEqual(comentarios);
    expect(q.eq).toHaveBeenCalledWith('word', 'CARRO');
    expect(q.eq).toHaveBeenCalledWith('date', '2026-05-11');
  });

  it('retorna [] quando o Supabase retorna erro', async () => {
    supabase.from.mockImplementation(() => makeSelectChainEndOnOrder(null, { message: 'erro' }));
    const result = await getCommentsByWord('2026-05-11', 'CARRO');
    expect(result).toEqual([]);
  });

  it('retorna [] quando data é null sem erro', async () => {
    supabase.from.mockImplementation(() => makeSelectChainEndOnOrder(null, null));
    const result = await getCommentsByWord('2026-05-11', 'CARRO');
    expect(result).toEqual([]);
  });
});
