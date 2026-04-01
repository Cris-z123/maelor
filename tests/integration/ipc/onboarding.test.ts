import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

import { IPC_CHANNELS } from '@/ipc/channels';
import { MVP_ACTIVE_IPC_CHANNELS, registerMvpIpcHandlers } from '@/ipc/registerMvpHandlers';

describe('MVP onboarding IPC contracts', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  const deps = {
    getOnboardingStatus: vi.fn(),
    detectOutlookDirectory: vi.fn(),
    validateOutlookDirectory: vi.fn(),
    testConnection: vi.fn(),
    completeOnboarding: vi.fn(),
    startRun: vi.fn(),
    getLatestRun: vi.fn(),
    getRunById: vi.fn(),
    listRecentRuns: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    getDataSummary: vi.fn(),
    clearRuns: vi.fn(),
    rebuildIndex: vi.fn(),
  };

  beforeEach(async () => {
    handlers.clear();
    vi.clearAllMocks();

    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
      return ipcMain;
    });

    deps.getOnboardingStatus.mockResolvedValue({
      completed: false,
      currentStep: 2,
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      readablePstCount: 1,
    });
    deps.detectOutlookDirectory.mockResolvedValue({
      detectedPath: 'C:\\Users\\User\\Documents\\Outlook Files',
      reason: 'Detected PST files in a default Outlook directory.',
    });
    deps.validateOutlookDirectory.mockResolvedValue({
      valid: true,
      readablePstCount: 1,
      unreadablePstCount: 0,
      files: [
        {
          path: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
          fileName: 'mailbox.pst',
          sizeBytes: 128,
          modifiedAt: 1,
          readability: 'readable',
          reason: null,
        },
      ],
      message: 'Found 1 readable PST file.',
    });
    deps.testConnection.mockResolvedValue({
      success: true,
      responseTimeMs: 180,
      message: 'AI connection succeeded.',
    });
    deps.completeOnboarding.mockResolvedValue({ success: true });

    await registerMvpIpcHandlers(deps);
  });

  it('registers only the MVP runtime channels', () => {
    expect(Array.from(handlers.keys())).toEqual(MVP_ACTIVE_IPC_CHANNELS);
    expect(ipcMain.removeHandler).toHaveBeenCalledTimes(MVP_ACTIVE_IPC_CHANNELS.length);
  });

  it('returns the onboarding status contract', async () => {
    const handler = handlers.get(IPC_CHANNELS.ONBOARDING_GET_STATUS);
    const result = await handler?.({});

    expect(result).toEqual({
      completed: false,
      currentStep: 2,
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      readablePstCount: 1,
    });
    expect(deps.getOnboardingStatus).toHaveBeenCalledOnce();
  });

  it('returns advisory Outlook auto-detection without persisting configuration', async () => {
    const handler = handlers.get(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT);
    const result = await handler?.({});

    expect(result).toEqual({
      detectedPath: 'C:\\Users\\User\\Documents\\Outlook Files',
      reason: 'Detected PST files in a default Outlook directory.',
    });
    expect(deps.detectOutlookDirectory).toHaveBeenCalledOnce();
  });

  it('returns the directory validation contract with PST classifications', async () => {
    const handler = handlers.get(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH);
    const result = await handler?.({}, 'C:\\Users\\User\\Documents\\Outlook Files');

    expect(deps.validateOutlookDirectory).toHaveBeenCalledWith('C:\\Users\\User\\Documents\\Outlook Files');
    expect(result).toEqual(
      expect.objectContaining({
        valid: true,
        readablePstCount: 1,
        unreadablePstCount: 0,
        files: [
          expect.objectContaining({
            fileName: 'mailbox.pst',
            readability: 'readable',
          }),
        ],
      })
    );
  });

  it('returns the AI connection contract', async () => {
    const handler = handlers.get(IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION);
    const request = {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      model: 'gpt-4.1-mini',
    };

    const result = await handler?.({}, request);

    expect(deps.testConnection).toHaveBeenCalledWith(request);
    expect(result).toEqual({
      success: true,
      responseTimeMs: 180,
      message: 'AI connection succeeded.',
    });
  });

  it('completes onboarding with the persisted contract payload', async () => {
    const handler = handlers.get(IPC_CHANNELS.ONBOARDING_COMPLETE_SETUP);
    const request = {
      directoryPath: 'C:\\Users\\User\\Documents\\Outlook Files',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      model: 'gpt-4.1-mini',
    };

    const result = await handler?.({}, request);

    expect(deps.completeOnboarding).toHaveBeenCalledWith(request);
    expect(result).toEqual({ success: true });
  });
});

