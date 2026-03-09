import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClipboard } from '@renderer/hooks/useClipboard';

// Mock Electron clipboard API
vi.mock('electron', () => ({
  clipboard: {
    writeText: vi.fn(),
  },
}));

describe('useClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should copy text to clipboard and set copied to true', async () => {
    const { clipboard } = await import('electron');
    const writeText = clipboard.writeText as ReturnType<typeof vi.fn>;

    writeText.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useClipboard());

    expect(result.current.copied).toBe(false);

    await act(async () => {
      const success = await result.current.copy('test text');
      expect(success).toBe(true);
    });

    expect(writeText).toHaveBeenCalledWith('test text');
    expect(result.current.copied).toBe(true);
  });

  it('should reset copied state after 1 second', async () => {
    const { clipboard } = await import('electron');
    const writeText = clipboard.writeText as ReturnType<typeof vi.fn>;

    writeText.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.copied).toBe(false);
  });

  it('should handle clipboard errors and return false', async () => {
    const { clipboard } = await import('electron');
    const writeText = clipboard.writeText as ReturnType<typeof vi.fn>;

    writeText.mockRejectedValueOnce(new Error('Clipboard error'));

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      const success = await result.current.copy('test text');
      expect(success).toBe(false);
    });

    expect(writeText).toHaveBeenCalledWith('test text');
    expect(result.current.copied).toBe(false);
  });

  it('should maintain stable function reference across renders', async () => {
    const { result, rerender } = renderHook(() => useClipboard());

    const firstCopy = result.current.copy;

    rerender();

    const secondCopy = result.current.copy;

    expect(firstCopy).toBe(secondCopy);
  });
});
