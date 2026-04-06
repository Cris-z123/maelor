import { beforeEach, describe, expect, it, vi } from 'vitest';

const { browserWindowConstructor } = vi.hoisted(() => ({
    browserWindowConstructor: vi.fn(),
}));

vi.mock('electron', () => ({
    BrowserWindow: browserWindowConstructor,
}));

import { createOnboardingWindow } from '@/windows/onboardingWindow';

type WindowMock = {
    loadURL: ReturnType<typeof vi.fn>;
    loadFile: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
    webContents: {
        openDevTools: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
        getURL: ReturnType<typeof vi.fn>;
    };
};

function createWindowMock(currentUrl = 'http://localhost:3000/onboarding.html'): WindowMock {
    return {
        loadURL: vi.fn(),
        loadFile: vi.fn(),
        show: vi.fn(),
        once: vi.fn((event: string, handler: () => void) => {
            if (event === 'ready-to-show') {
                handler();
            }
        }),
        webContents: {
            openDevTools: vi.fn(),
            on: vi.fn(),
            getURL: vi.fn(() => currentUrl),
        },
    };
}

describe('createOnboardingWindow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates the development onboarding window and blocks cross-page navigation', () => {
        process.env.NODE_ENV = 'development';
        const windowMock = createWindowMock();
        browserWindowConstructor.mockReturnValue(windowMock);

        const created = createOnboardingWindow();

        expect(created).toBe(windowMock);
        expect(browserWindowConstructor).toHaveBeenCalledWith(
            expect.objectContaining({
                width: 900,
                height: 700,
                resizable: false,
                alwaysOnTop: true,
                autoHideMenuBar: true,
            }),
        );
        expect(windowMock.loadURL).toHaveBeenCalledWith('http://localhost:3000/onboarding.html');
        expect(windowMock.webContents.openDevTools).toHaveBeenCalledOnce();
        expect(windowMock.show).toHaveBeenCalledOnce();

        const navigateHandler = windowMock.webContents.on.mock.calls.find(
            ([event]) => event === 'will-navigate',
        )?.[1] as ((event: { preventDefault: () => void }, url: string) => void) | undefined;
        const preventDefault = vi.fn();
        navigateHandler?.({ preventDefault }, 'http://malicious.example');
        expect(preventDefault).toHaveBeenCalledOnce();
    });

    it('loads the packaged onboarding page in production and allows same-page navigation events', () => {
        process.env.NODE_ENV = 'production';
        const windowMock = createWindowMock('file:///app/onboarding.html');
        browserWindowConstructor.mockReturnValue(windowMock);

        createOnboardingWindow();

        expect(windowMock.loadFile).toHaveBeenCalledWith(
            expect.stringContaining('renderer\\onboarding.html'),
        );
        expect(windowMock.webContents.openDevTools).not.toHaveBeenCalled();

        const navigateHandler = windowMock.webContents.on.mock.calls.find(
            ([event]) => event === 'will-navigate',
        )?.[1] as ((event: { preventDefault: () => void }, url: string) => void) | undefined;
        const preventDefault = vi.fn();
        navigateHandler?.({ preventDefault }, 'file:///app/onboarding.html');
        expect(preventDefault).not.toHaveBeenCalled();
    });
});
