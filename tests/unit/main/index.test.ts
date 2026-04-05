import { beforeEach, describe, expect, it, vi } from 'vitest';

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('main index entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'production';
    delete process.env.ELECTRON_DISABLE_SECURITY_WARNINGS;
  });

  it('throws immediately when the application manager reports a second instance', async () => {
    const app = {
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
      exit: vi.fn(),
      quit: vi.fn(),
    };

    vi.doMock('electron', () => ({
      app,
      BrowserWindow: vi.fn(),
    }));
    vi.doMock('@/app', () => ({
      ApplicationManager: {
        initialize: vi.fn(() => false),
        setReady: vi.fn(),
      },
      SingleInstanceManager: {
        releaseLock: vi.fn(),
        setMainWindow: vi.fn(),
      },
    }));
    vi.doMock('@/config/ConfigManager', () => ({
      ConfigManager: {
        initialize: vi.fn(),
        initializeDefaults: vi.fn(),
      },
    }));
    vi.doMock('@/config/logger', () => ({
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        showFatalStartupDialog: vi.fn(),
      },
    }));
    vi.doMock('@/database/Database', () => ({
      default: {
        initialize: vi.fn(),
        close: vi.fn(),
      },
    }));
    vi.doMock('@/database/schema', () => ({
      SchemaManager: {
        initialize: vi.fn(),
      },
    }));
    vi.doMock('@/error-handler', () => ({
      errorHandler: {
        initialize: vi.fn(),
        setMainWindow: vi.fn(),
        handleRendererProcessGone: vi.fn(),
      },
    }));
    vi.doMock('@/ipc/registerAppHandlers', () => ({
      registerAppIpcHandlers: vi.fn(),
    }));
    vi.doMock('@/onboarding/OnboardingManager', () => ({
      default: {
        isComplete: vi.fn(() => false),
      },
    }));
    vi.doMock('@/windows/onboardingWindow', () => ({
      createOnboardingWindow: vi.fn(),
    }));

    await expect(import('@/index')).rejects.toThrow('Second instance detected - exiting');
  });

  it('boots the application, registers handlers, creates windows, and responds to lifecycle events', async () => {
    const appHandlers = new Map<string, () => void>();
    const onboardingWindowHandlers = new Map<string, () => void>();
    const mainWindowHandlers = new Map<string, () => void>();
    const renderProcessGoneHandlers: Array<(_: unknown, details: unknown) => void> = [];
    const app = {
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn((event: string, handler: () => void) => {
        appHandlers.set(event, handler);
      }),
      exit: vi.fn(),
      quit: vi.fn(),
    };
    const onboardingWindow = {
      on: vi.fn((event: string, handler: () => void) => {
        onboardingWindowHandlers.set(event, handler);
      }),
    };
    const mainWindow = {
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      show: vi.fn(),
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'ready-to-show') {
          handler();
        }
      }),
      on: vi.fn((event: string, handler: () => void) => {
        mainWindowHandlers.set(event, handler);
      }),
      webContents: {
        openDevTools: vi.fn(),
        on: vi.fn((event: string, handler: (_event: unknown, details: unknown) => void) => {
          if (event === 'render-process-gone') {
            renderProcessGoneHandlers.push(handler);
          }
        }),
      },
    };
    const BrowserWindow = vi.fn(() => mainWindow);
    (BrowserWindow as unknown as { getAllWindows: () => unknown[] }).getAllWindows = vi.fn(() => []);
    const initialize = vi.fn(() => true);
    const setReady = vi.fn();
    const setMainWindow = vi.fn();
    const releaseLock = vi.fn();
    const configInitialize = vi.fn().mockResolvedValue(undefined);
    const configInitializeDefaults = vi.fn().mockResolvedValue(undefined);
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const databaseInitialize = vi.fn();
    const databaseClose = vi.fn();
    const schemaInitialize = vi.fn().mockResolvedValue(undefined);
    const errorHandler = {
      initialize: vi.fn(),
      setMainWindow: vi.fn(),
      handleRendererProcessGone: vi.fn(),
      showFatalStartupDialog: vi.fn(),
    };
    const registerAppIpcHandlers = vi.fn().mockResolvedValue(undefined);
    const isComplete = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    const createOnboardingWindow = vi.fn(() => onboardingWindow);

    vi.doMock('electron', () => ({
      app,
      BrowserWindow,
    }));
    vi.doMock('@/app', () => ({
      ApplicationManager: {
        initialize,
        setReady,
      },
      SingleInstanceManager: {
        releaseLock,
        setMainWindow,
      },
    }));
    vi.doMock('@/config/ConfigManager', () => ({
      ConfigManager: {
        initialize: configInitialize,
        initializeDefaults: configInitializeDefaults,
      },
    }));
    vi.doMock('@/config/logger', () => ({ logger }));
    vi.doMock('@/database/Database', () => ({
      default: {
        initialize: databaseInitialize,
        close: databaseClose,
      },
    }));
    vi.doMock('@/database/schema', () => ({
      SchemaManager: {
        initialize: schemaInitialize,
      },
    }));
    vi.doMock('@/error-handler', () => ({ errorHandler }));
    vi.doMock('@/ipc/registerAppHandlers', () => ({ registerAppIpcHandlers }));
    vi.doMock('@/onboarding/OnboardingManager', () => ({
      default: {
        isComplete,
      },
    }));
    vi.doMock('@/windows/onboardingWindow', () => ({ createOnboardingWindow }));

    const mod = await import('@/index');
    await flushPromises();

    expect(mod.default).toBeTypeOf('function');
    expect(errorHandler.initialize).toHaveBeenCalledOnce();
    expect(initialize).toHaveBeenCalledOnce();
    expect(databaseInitialize).toHaveBeenCalledOnce();
    expect(schemaInitialize).toHaveBeenCalledOnce();
    expect(configInitialize).toHaveBeenCalledOnce();
    expect(configInitializeDefaults).toHaveBeenCalledOnce();
    expect(registerAppIpcHandlers).toHaveBeenCalledOnce();
    expect(createOnboardingWindow).toHaveBeenCalledOnce();
    expect(setReady).toHaveBeenCalledOnce();

    onboardingWindowHandlers.get('closed')?.();
    expect(BrowserWindow).toHaveBeenCalledOnce();
    expect(mainWindow.loadFile).toHaveBeenCalledWith(expect.stringContaining('renderer\\index.html'));
    expect(mainWindow.show).toHaveBeenCalledOnce();
    expect(setMainWindow).toHaveBeenCalledWith(mainWindow);
    expect(errorHandler.setMainWindow).toHaveBeenCalledWith(mainWindow);

    renderProcessGoneHandlers[0]?.({}, { reason: 'crashed', exitCode: 1 });
    expect(errorHandler.handleRendererProcessGone).toHaveBeenCalledWith({ reason: 'crashed', exitCode: 1 });

    mainWindowHandlers.get('closed')?.();
    expect(errorHandler.setMainWindow).toHaveBeenLastCalledWith(null);

    appHandlers.get('before-quit')?.();
    expect(databaseClose).toHaveBeenCalledOnce();

    appHandlers.get('window-all-closed')?.();
    expect(app.quit).toHaveBeenCalledOnce();

    appHandlers.get('activate')?.();
    expect(BrowserWindow).toHaveBeenCalledTimes(2);
  });

  it('converges fatal startup failures by closing resources, showing a dialog, releasing the lock, and exiting', async () => {
    const appHandlers = new Map<string, () => void>();
    const app = {
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn((event: string, handler: () => void) => {
        appHandlers.set(event, handler);
      }),
      exit: vi.fn(),
      quit: vi.fn(),
    };
    const initialize = vi.fn(() => true);
    const setReady = vi.fn();
    const releaseLock = vi.fn();
    const startupError = new Error('migration failed');
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const databaseInitialize = vi.fn();
    const databaseClose = vi.fn();
    const schemaInitialize = vi.fn().mockRejectedValue(startupError);
    const errorHandler = {
      initialize: vi.fn(),
      setMainWindow: vi.fn(),
      handleRendererProcessGone: vi.fn(),
      showFatalStartupDialog: vi.fn(),
    };
    const registerAppIpcHandlers = vi.fn().mockResolvedValue(undefined);

    vi.doMock('electron', () => ({
      app,
      BrowserWindow: vi.fn(),
    }));
    vi.doMock('@/app', () => ({
      ApplicationManager: {
        initialize,
        setReady,
      },
      SingleInstanceManager: {
        releaseLock,
        setMainWindow: vi.fn(),
      },
    }));
    vi.doMock('@/config/ConfigManager', () => ({
      ConfigManager: {
        initialize: vi.fn().mockResolvedValue(undefined),
        initializeDefaults: vi.fn().mockResolvedValue(undefined),
      },
    }));
    vi.doMock('@/config/logger', () => ({ logger }));
    vi.doMock('@/database/Database', () => ({
      default: {
        initialize: databaseInitialize,
        close: databaseClose,
      },
    }));
    vi.doMock('@/database/schema', () => ({
      SchemaManager: {
        initialize: schemaInitialize,
      },
    }));
    vi.doMock('@/error-handler', () => ({ errorHandler }));
    vi.doMock('@/ipc/registerAppHandlers', () => ({ registerAppIpcHandlers }));
    vi.doMock('@/onboarding/OnboardingManager', () => ({
      default: {
        isComplete: vi.fn(() => false),
      },
    }));
    vi.doMock('@/windows/onboardingWindow', () => ({
      createOnboardingWindow: vi.fn(),
    }));

    await import('@/index');
    await flushPromises();

    expect(databaseInitialize).toHaveBeenCalledOnce();
    expect(registerAppIpcHandlers).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Application', 'Fatal startup failure', startupError);
    expect(databaseClose).toHaveBeenCalledOnce();
    expect(errorHandler.showFatalStartupDialog).toHaveBeenCalledWith(startupError);
    expect(releaseLock).toHaveBeenCalledOnce();
    expect(setReady).not.toHaveBeenCalled();
    expect(app.exit).toHaveBeenCalledWith(1);
  });
});
