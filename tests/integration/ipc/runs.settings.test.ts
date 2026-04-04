import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

import { IPC_CHANNELS } from '@/ipc/channels';
import { registerAppIpcHandlers } from '@/ipc/registerAppHandlers';

describe('Phase 4 IPC contracts', () => {
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

    deps.listRecentRuns.mockResolvedValue([
      {
        runId: 'run-9',
        startedAt: 1710001000000,
        finishedAt: 1710001060000,
        status: 'completed',
        pstCount: 2,
        processedEmailCount: 20,
        itemCount: 4,
        lowConfidenceCount: 1,
      },
      {
        runId: 'run-8',
        startedAt: 1710000000000,
        finishedAt: 1710000060000,
        status: 'failed',
        pstCount: 1,
        processedEmailCount: 7,
        itemCount: 0,
        lowConfidenceCount: 0,
      },
    ]);
    deps.getSettings.mockResolvedValue({
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
    });
    deps.updateSettings.mockResolvedValue({ success: true });
    deps.getDataSummary.mockResolvedValue({
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
      databasePath: 'D:\\mailCopilot\\mailcopilot.db',
      databaseSizeBytes: 4096,
    });
    deps.clearRuns.mockResolvedValue({ success: true, deletedRunCount: 5 });
    deps.rebuildIndex.mockResolvedValue({ success: true, message: 'Index rebuild completed.' });

    await registerAppIpcHandlers(deps);
  });

  it('returns recent run summaries and forwards the requested limit', async () => {
    const handler = handlers.get(IPC_CHANNELS.RUNS_LIST_RECENT);
    const result = await handler?.({}, { limit: 20 });

    expect(deps.listRecentRuns).toHaveBeenCalledWith(20);
    expect(result).toEqual([
      expect.objectContaining({
        runId: 'run-9',
        pstCount: 2,
        itemCount: 4,
      }),
      expect.objectContaining({
        runId: 'run-8',
        status: 'failed',
      }),
    ]);
  });

  it('returns the editable settings contract', async () => {
    const handler = handlers.get(IPC_CHANNELS.SETTINGS_GET_ALL);
    const result = await handler?.({});

    expect(deps.getSettings).toHaveBeenCalledOnce();
    expect(result).toEqual({
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
    });
  });

  it('updates settings using the nested IPC request payload', async () => {
    const handler = handlers.get(IPC_CHANNELS.SETTINGS_UPDATE);
    const request = {
      updates: {
        outlookDirectory: 'D:\\Mail',
        aiBaseUrl: 'https://example.com/v1',
        aiModel: 'gpt-4.1',
        apiKey: 'secret',
      },
    };

    const result = await handler?.({}, request);

    expect(deps.updateSettings).toHaveBeenCalledWith(request);
    expect(result).toEqual({ success: true });
  });

  it('returns the settings data summary contract', async () => {
    const handler = handlers.get(IPC_CHANNELS.SETTINGS_GET_DATA_SUMMARY);
    const result = await handler?.({});

    expect(deps.getDataSummary).toHaveBeenCalledOnce();
    expect(result).toEqual({
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
      databasePath: 'D:\\mailCopilot\\mailcopilot.db',
      databaseSizeBytes: 4096,
    });
  });

  it('returns data-management contracts for clearing runs and rebuilding indexes', async () => {
    const clearRunsHandler = handlers.get(IPC_CHANNELS.SETTINGS_CLEAR_RUNS);
    const rebuildIndexHandler = handlers.get(IPC_CHANNELS.SETTINGS_REBUILD_INDEX);

    await expect(clearRunsHandler?.({})).resolves.toEqual({
      success: true,
      deletedRunCount: 5,
    });
    await expect(rebuildIndexHandler?.({})).resolves.toEqual({
      success: true,
      message: 'Index rebuild completed.',
    });

    expect(deps.clearRuns).toHaveBeenCalledOnce();
    expect(deps.rebuildIndex).toHaveBeenCalledOnce();
  });
});
