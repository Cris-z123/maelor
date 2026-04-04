import { beforeEach, describe, expect, it, vi } from 'vitest';

const { appMock } = vi.hoisted(() => {
  const app = {
    requestSingleInstanceLock: vi.fn(),
    on: vi.fn(),
    releaseSingleInstanceLock: vi.fn(),
    quit: vi.fn(),
  };

  return {
    appMock: app,
  };
});

vi.mock('electron', () => ({
  app: appMock,
  BrowserWindow: vi.fn(),
}));

import { logger } from '@/config/logger';
import { ApplicationManager, SingleInstanceManager } from '@/app';

type WindowLike = {
  isMinimized: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
};

function resetAppState(): void {
  (SingleInstanceManager as unknown as { hasLock: boolean }).hasLock = false;
  (SingleInstanceManager as unknown as { mainWindow: WindowLike | null }).mainWindow = null;
  (ApplicationManager as unknown as { isReady: boolean }).isReady = false;
}

describe('app lifecycle managers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppState();
  });

  it('refuses a second instance when the lock cannot be acquired', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    appMock.requestSingleInstanceLock.mockReturnValue(false);

    expect(SingleInstanceManager.acquireLock()).toBe(false);
    expect(warn).toHaveBeenCalledWith('SingleInstance', 'Second instance detected - quitting');
    expect(appMock.on).not.toHaveBeenCalledWith('second-instance', expect.any(Function));
  });

  it('focuses the existing window for a second instance', () => {
    const windowMock: WindowLike = {
      isMinimized: vi.fn().mockReturnValue(true),
      restore: vi.fn(),
      focus: vi.fn(),
    };
    appMock.requestSingleInstanceLock.mockReturnValue(true);

    expect(SingleInstanceManager.acquireLock()).toBe(true);
    SingleInstanceManager.setMainWindow(windowMock as never);

    const secondInstanceHandler = appMock.on.mock.calls.find(([event]) => event === 'second-instance')?.[1] as
      | ((event: Electron.Event, commandLine: string[], workingDirectory: string) => void)
      | undefined;

    secondInstanceHandler?.({} as Electron.Event, ['mailCopilot.exe'], 'D:\\work');

    expect(windowMock.restore).toHaveBeenCalledOnce();
    expect(windowMock.focus).toHaveBeenCalledTimes(1);
  });

  it('logs when a second instance appears without a registered window and releases the lock on quit', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    appMock.requestSingleInstanceLock.mockReturnValue(true);

    SingleInstanceManager.acquireLock();
    const secondInstanceHandler = appMock.on.mock.calls.find(([event]) => event === 'second-instance')?.[1] as
      | ((event: Electron.Event, commandLine: string[], workingDirectory: string) => void)
      | undefined;

    secondInstanceHandler?.({} as Electron.Event, [], 'D:\\work');

    expect(warn).toHaveBeenCalledWith('SingleInstance', 'Second instance detected but no main window available');
    expect(SingleInstanceManager.isMainInstance()).toBe(true);
    SingleInstanceManager.releaseLock();
    expect(appMock.releaseSingleInstanceLock).toHaveBeenCalledOnce();
    expect(SingleInstanceManager.isMainInstance()).toBe(false);
  });

  it('initializes the application manager when the lock is available', () => {
    appMock.requestSingleInstanceLock.mockReturnValue(true);

    expect(ApplicationManager.initialize()).toBe(true);
    expect(appMock.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
    expect(appMock.on).toHaveBeenCalledWith('will-quit', expect.any(Function));

    ApplicationManager.setReady();
    expect(ApplicationManager.isAppReady()).toBe(true);

    const willQuitHandler = appMock.on.mock.calls.find(([event]) => event === 'will-quit')?.[1] as
      | ((event: Electron.Event) => void)
      | undefined;
    willQuitHandler?.({} as Electron.Event);
    expect(appMock.releaseSingleInstanceLock).toHaveBeenCalledOnce();

    ApplicationManager.quit();
    expect(appMock.quit).toHaveBeenCalledOnce();
  });

  it('quits immediately when another instance is already running', () => {
    appMock.requestSingleInstanceLock.mockReturnValue(false);

    expect(ApplicationManager.initialize()).toBe(false);
    expect(appMock.quit).toHaveBeenCalledOnce();
  });
});