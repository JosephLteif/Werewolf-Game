import { renderHook } from '@testing-library/react';
import { useTimeout } from '../hooks/useTimeout';
import { vi } from 'vitest';

describe('useTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call the callback after the specified delay', () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, 1000));

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call the callback if the delay is null', () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, null));

    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear the timeout on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useTimeout(callback, 1000));

    unmount();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });
});
