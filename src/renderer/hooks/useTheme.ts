import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'maelor-theme';

function getStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }

    return 'system';
}

function applyTheme(theme: Theme): void {
    const root = document.documentElement;

    if (theme === 'dark') {
        root.classList.add('dark');
        return;
    }

    if (theme === 'light') {
        root.classList.remove('dark');
        return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getStoredTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (theme !== 'system') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme('system');

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    function setTheme(next: Theme): void {
        setThemeState(next);

        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // localStorage unavailable
        }
    }

    return { theme, setTheme } as const;
}
