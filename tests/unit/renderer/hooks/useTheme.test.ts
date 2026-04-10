import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTheme } from '@renderer/hooks/useTheme';

type MatchMediaState = {
    matches: boolean;
    listener: ((event: MediaQueryListEvent) => void) | null;
};

describe('useTheme', () => {
    let matchMediaState: MatchMediaState;
    let storage: Map<string, string>;

    beforeEach(() => {
        storage = new Map();
        document.documentElement.className = '';
        matchMediaState = { matches: false, listener: null };

        const localStorageMock = {
            getItem: vi.fn((key: string) => storage.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => {
                storage.set(key, value);
            }),
            removeItem: vi.fn((key: string) => {
                storage.delete(key);
            }),
            clear: vi.fn(() => {
                storage.clear();
            }),
        };

        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            writable: true,
            value: localStorageMock,
        });

        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            writable: true,
            value: localStorageMock,
        });

        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: vi.fn(() => ({
                matches: matchMediaState.matches,
                media: '(prefers-color-scheme: dark)',
                onchange: null,
                addEventListener: vi.fn((_event, listener) => {
                    matchMediaState.listener =
                        listener as (event: MediaQueryListEvent) => void;
                }),
                removeEventListener: vi.fn((_event, listener) => {
                    if (matchMediaState.listener === listener) {
                        matchMediaState.listener = null;
                    }
                }),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    afterEach(() => {
        window.localStorage.clear();
        document.documentElement.className = '';
    });

    it('defaults to system and applies the dark class from system preference', async () => {
        matchMediaState.matches = true;

        const { result } = renderHook(() => useTheme());

        await waitFor(() => {
            expect(result.current.theme).toBe('system');
        });
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('persists explicit theme changes and updates the document class', async () => {
        const { result } = renderHook(() => useTheme());

        act(() => {
            result.current.setTheme('dark');
        });

        await waitFor(() => {
            expect(result.current.theme).toBe('dark');
        });
        expect(window.localStorage.getItem('maelor-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('responds to system theme changes while in system mode', async () => {
        const { result } = renderHook(() => useTheme());

        await waitFor(() => {
            expect(result.current.theme).toBe('system');
        });

        act(() => {
            matchMediaState.matches = true;
            matchMediaState.listener?.({ matches: true } as MediaQueryListEvent);
        });

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
