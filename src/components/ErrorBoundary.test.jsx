import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('getDerivedStateFromError sets hasError to true', () => {
    const state = ErrorBoundary.getDerivedStateFromError(new Error('boom'));
    expect(state).toEqual({ hasError: true });
  });

  it('componentDidCatch logs error and component stack to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boundary = new ErrorBoundary({});
    const err = new Error('test error');
    const info = { componentStack: '\n    in Foo\n    in App' };

    boundary.componentDidCatch(err, info);

    expect(consoleSpy).toHaveBeenCalledWith('[ErrorBoundary]', err, info.componentStack);
    consoleSpy.mockRestore();
  });

  it('initializes with hasError: false', () => {
    const boundary = new ErrorBoundary({});
    expect(boundary.state).toEqual({ hasError: false });
  });
});
