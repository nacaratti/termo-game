import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { hasSubmittedComment, submitComment } from './comments';

beforeEach(() => {
  localStorage.clear();
});

// ─── hasSubmittedComment ──────────────────────────────────────────────────────

describe('hasSubmittedComment', () => {
  it('returns false when nothing is stored', () => {
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(false);
  });

  it('returns false for unknown date/mode pair', () => {
    localStorage.setItem('_cmt_submitted', JSON.stringify({ '2026-05-10|5': true }));
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(false);
    expect(hasSubmittedComment('2026-05-10', '6')).toBe(false);
  });

  it('returns true after a matching key is stored', () => {
    localStorage.setItem('_cmt_submitted', JSON.stringify({ '2026-05-11|5': true }));
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(true);
  });

  it('distinguishes between different modes for the same date', () => {
    localStorage.setItem('_cmt_submitted', JSON.stringify({ '2026-05-11|5': true }));
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(true);
    expect(hasSubmittedComment('2026-05-11', '6')).toBe(false);
  });

  it('returns false when localStorage contains invalid JSON', () => {
    localStorage.setItem('_cmt_submitted', 'not-json');
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(false);
  });
});

// ─── submitComment (offline — supabase is null) ───────────────────────────────

describe('submitComment (offline)', () => {
  it('returns { ok: false, error: "offline" } when supabase is null', async () => {
    const result = await submitComment({
      dateStr: '2026-05-11',
      word: 'CARRO',
      mode: '5',
      comment: 'Ótima palavra!',
      won: true,
      attempts: 3,
    });
    expect(result).toEqual({ ok: false, error: 'offline' });
  });

  it('returns "offline" even for empty comment when supabase is null', async () => {
    // offline check happens before empty check in submitComment
    const result = await submitComment({
      dateStr: '2026-05-11',
      word: 'CARRO',
      mode: '5',
      comment: '   ',
      won: true,
      attempts: 3,
    });
    expect(result).toEqual({ ok: false, error: 'offline' });
  });

  it('does not mark comment as submitted when offline', async () => {
    await submitComment({
      dateStr: '2026-05-11',
      word: 'CARRO',
      mode: '5',
      comment: 'Boa!',
      won: true,
      attempts: 2,
    });
    expect(hasSubmittedComment('2026-05-11', '5')).toBe(false);
  });

  it('does not mark comment as submitted for mode "6" when offline', async () => {
    await submitComment({
      dateStr: '2026-05-11',
      word: 'CAVALO',
      mode: '6',
      comment: 'Difícil!',
      won: false,
      attempts: 7,
    });
    expect(hasSubmittedComment('2026-05-11', '6')).toBe(false);
  });
});
