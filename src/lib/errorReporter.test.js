import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockInsert, mockFrom } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  return { mockInsert, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import { isBenign, initErrorReporter } from './errorReporter';

beforeEach(() => {
  mockInsert.mockClear();
  mockFrom.mockClear();
});

// ─── isBenign ────────────────────────────────────────────────────────────────

describe('isBenign', () => {
  it('detects Supabase lock stolen error (mixed case)', () => {
    expect(isBenign('Lock was stolen by another request')).toBe(true);
  });

  it('detects lock stolen error in lowercase', () => {
    expect(isBenign('lock was stolen')).toBe(true);
  });

  it('detects lock request aborted error', () => {
    expect(isBenign('Lock request aborted')).toBe(true);
  });

  it('returns false for real application errors', () => {
    expect(isBenign('Cannot read properties of undefined')).toBe(false);
    expect(isBenign('TypeError: x is not a function')).toBe(false);
    expect(isBenign('Network Error')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isBenign('')).toBe(false);
  });
});

// ─── initErrorReporter — filtro de erros benignos ────────────────────────────

describe('initErrorReporter (unhandledrejection filter)', () => {
  it('does not report Supabase lock stolen errors to the database', async () => {
    initErrorReporter();

    const event = new Event('unhandledrejection');
    event.reason = new Error('Lock was stolen by another request');
    window.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 10));

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('does not report lock request aborted errors to the database', async () => {
    initErrorReporter();

    const event = new Event('unhandledrejection');
    event.reason = new Error('Lock request aborted');
    window.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 10));

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
