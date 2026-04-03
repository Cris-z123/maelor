import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handle, removeHandler } = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle,
    removeHandler,
  },
}));

import { ConfigManager } from '@/config/ConfigManager';
import { logger } from '@/config/logger';
import DatabaseManager from '@/database/Database';
import { IPC_CHANNELS } from '@/ipc/channels';
import { ACTIVE_IPC_CHANNELS, registerAppIpcHandlers } from '@/ipc/registerAppHandlers';
import OnboardingManager from '@/onboarding/OnboardingManager';
import PstDiscovery from '@/outlook/PstDiscovery';
import RunExecutionService from '@/runs/RunExecutionService';
import RunRepository from '@/runs/RunRepository';

type HandlerMap = Map<string, (...args: unknown[]) => Promise<unknown>>;

function getRegisteredHandlers(): HandlerMap {
  return new Map(handle.mock.calls.map(([channel, fn]) => [channel as string, fn as (...args: unknown[]) => Promise<unknown>]));
}

describe('registerAppIpcHandlers', () => {
  beforeEach(() => {
    handle.mockReset();
    removeHandler.mockReset();
    vi.restoreAllMocks();
  });

  it('removes old handlers and registers override-backed handlers', async () => {
    const overrides = {
      getOnboardingStatus: vi.fn().mockResolvedValue({ completed: true, currentStep: 3, outlookDirectory: 'C:\\', readablePstCount: 1 }),
      detectOutlookDirectory: vi.fn().mockResolvedValue({ detectedPath: 'C:\\', reason: 'found' }),
      validateOutlookDirectory: vi.fn().mockResolvedValue({ valid: true, readablePstCount: 1, unreadablePstCount: 0, files: [], message: 'ok' }),
      testConnection: vi.fn().mockResolvedValue({ success: true, responseTimeMs: 1, message: 'ok' }),
      completeOnboarding: vi.fn().mockResolvedValue({ success: true }),
      startRun: vi.fn().mockResolvedValue({ success: true, runId: 'run-1', message: 'done' }),
      getLatestRun: vi.fn().mockResolvedValue({ runId: 'run-1' }),
      getRunById: vi.fn().mockResolvedValue({ runId: 'run-2' }),
      listRecentRuns: vi.fn().mockResolvedValue([{ runId: 'run-1' }]),
      getSettings: vi.fn().mockResolvedValue({ outlookDirectory: 'C:\\', aiBaseUrl: 'https://', aiModel: 'gpt' }),
      updateSettings: vi.fn().mockResolvedValue({ success: true }),
      getDataSummary: vi.fn().mockResolvedValue({ outlookDirectory: 'C:\\', aiBaseUrl: 'https://', aiModel: 'gpt', databasePath: 'db', databaseSizeBytes: 1 }),
      clearRuns: vi.fn().mockResolvedValue({ success: true, deletedRunCount: 3 }),
      rebuildIndex: vi.fn().mockResolvedValue({ success: true, message: 'rebuilt' }),
    };

    await registerAppIpcHandlers(overrides);

    expect(removeHandler.mock.calls.map(([channel]) => channel)).toEqual([...ACTIVE_IPC_CHANNELS]);
    expect(handle).toHaveBeenCalledTimes(ACTIVE_IPC_CHANNELS.length);

    const registered = getRegisteredHandlers();
    await expect(registered.get(IPC_CHANNELS.ONBOARDING_GET_STATUS)?.()).resolves.toEqual({
      completed: true,
      currentStep: 3,
      outlookDirectory: 'C:\\',
      readablePstCount: 1,
    });
    await expect(registered.get(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH)?.({} as never, 'C:\\Inbox')).resolves.toEqual({
      valid: true,
      readablePstCount: 1,
      unreadablePstCount: 0,
      files: [],
      message: 'ok',
    });
    await expect(registered.get(IPC_CHANNELS.RUNS_GET_BY_ID)?.({} as never, { runId: 'run-2' })).resolves.toEqual({
      runId: 'run-2',
    });
    await expect(registered.get(IPC_CHANNELS.SETTINGS_REBUILD_INDEX)?.()).resolves.toEqual({
      success: true,
      message: 'rebuilt',
    });
  });

  it('uses default dependencies for onboarding, runs, and settings actions', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    vi.spyOn(OnboardingManager, 'getState').mockReturnValue({
      completed: false,
      currentStep: 1,
      outlookDirectory: '',
      detectedOutlookDirectory: null,
      readablePstCount: 0,
      ai: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4.1-mini',
        connectionStatus: 'untested',
        responseTimeMs: null,
      },
      lastUpdated: 1,
    });
    vi.spyOn(OnboardingManager, 'detectOutlookDirectory').mockReturnValue({ detectedPath: 'C:\\Outlook', reason: 'found' });
    vi.spyOn(OnboardingManager, 'recordValidation').mockReturnValue({} as never);
    vi.spyOn(OnboardingManager, 'testConnection').mockResolvedValue({ success: true, responseTimeMs: 90, message: 'connected' });
    vi.spyOn(OnboardingManager, 'completeSetup').mockReturnValue({} as never);
    vi.spyOn(PstDiscovery, 'validateDirectory')
      .mockReturnValueOnce({ valid: true, readablePstCount: 1, unreadablePstCount: 0, files: [], message: 'valid-path' })
      .mockReturnValueOnce({ valid: false, readablePstCount: 0, unreadablePstCount: 0, files: [], message: 'invalid' })
      .mockReturnValueOnce({ valid: true, readablePstCount: 2, unreadablePstCount: 0, files: [], message: 'valid' });
    const setConfig = vi.spyOn(ConfigManager, 'set').mockResolvedValue([]);
    vi.spyOn(RunExecutionService.prototype, 'start').mockResolvedValue({ success: true, runId: 'run-1', message: 'done' });
    vi.spyOn(RunRepository, 'getLatest').mockResolvedValue({ runId: 'latest' } as never);
    vi.spyOn(RunRepository, 'getById').mockResolvedValue({ runId: 'detail' } as never);
    vi.spyOn(RunRepository, 'listRecent').mockResolvedValue([{ runId: 'recent' }] as never);
    vi.spyOn(RunRepository, 'getSettingsSeed').mockResolvedValue({
      outlookDirectory: 'C:\\Outlook',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
    });
    vi.spyOn(RunRepository, 'clearRuns').mockResolvedValue(4);
    vi.spyOn(DatabaseManager, 'getPath').mockReturnValue('D:\\db\\app.db');
    vi.spyOn(DatabaseManager, 'getSize').mockReturnValue(4096);
    const vacuum = vi.spyOn(DatabaseManager, 'vacuum').mockImplementation(() => undefined);

    await registerAppIpcHandlers();
    const registered = getRegisteredHandlers();

    await expect(registered.get(IPC_CHANNELS.ONBOARDING_GET_STATUS)?.()).resolves.toEqual({
      completed: false,
      currentStep: 1,
      readablePstCount: 0,
      outlookDirectory: null,
    });
    await expect(registered.get(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT)?.()).resolves.toEqual({
      detectedPath: 'C:\\Outlook',
      reason: 'found',
    });
    await expect(registered.get(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH)?.({} as never, 'C:\\Outlook')).resolves.toEqual({
      valid: true,
      readablePstCount: 1,
      unreadablePstCount: 0,
      files: [],
      message: 'valid-path',
    });
    await expect(
      registered.get(IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION)?.({} as never, {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'key',
        model: 'gpt-4.1-mini',
      })
    ).resolves.toEqual({
      success: true,
      responseTimeMs: 90,
      message: 'connected',
    });
    await expect(
      registered.get(IPC_CHANNELS.ONBOARDING_COMPLETE_SETUP)?.({} as never, {
        directoryPath: 'C:\\Outlook',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'secret',
        model: 'gpt-4.1-mini',
      })
    ).resolves.toEqual({ success: false, error: 'invalid' });
    await expect(
      registered.get(IPC_CHANNELS.ONBOARDING_COMPLETE_SETUP)?.({} as never, {
        directoryPath: 'C:\\Outlook',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'secret',
        model: 'gpt-4.1-mini',
      })
    ).resolves.toEqual({ success: true });
    await expect(registered.get(IPC_CHANNELS.RUNS_START)?.()).resolves.toEqual({
      success: true,
      runId: 'run-1',
      message: 'done',
    });
    await expect(registered.get(IPC_CHANNELS.RUNS_GET_LATEST)?.()).resolves.toEqual({ runId: 'latest' });
    await expect(registered.get(IPC_CHANNELS.RUNS_GET_BY_ID)?.({} as never, { runId: 'run-7' })).resolves.toEqual({
      runId: 'detail',
    });
    await expect(registered.get(IPC_CHANNELS.RUNS_LIST_RECENT)?.({} as never, undefined)).resolves.toEqual([{ runId: 'recent' }]);
    await expect(registered.get(IPC_CHANNELS.SETTINGS_GET_ALL)?.()).resolves.toEqual({
      outlookDirectory: 'C:\\Outlook',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
    });
    await expect(
      registered.get(IPC_CHANNELS.SETTINGS_UPDATE)?.({} as never, {
        updates: {
          outlookDirectory: 'C:\\New',
          aiBaseUrl: 'https://example.com',
          aiModel: 'gpt-4.1',
          apiKey: 'new-key',
        },
      })
    ).resolves.toEqual({ success: true });
    await expect(registered.get(IPC_CHANNELS.SETTINGS_GET_DATA_SUMMARY)?.()).resolves.toEqual({
      outlookDirectory: 'C:\\Outlook',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
      databasePath: 'D:\\db\\app.db',
      databaseSizeBytes: 4096,
    });
    await expect(registered.get(IPC_CHANNELS.SETTINGS_CLEAR_RUNS)?.()).resolves.toEqual({
      success: true,
      deletedRunCount: 4,
    });
    await expect(registered.get(IPC_CHANNELS.SETTINGS_REBUILD_INDEX)?.()).resolves.toEqual({
      success: true,
      message: 'Index rebuild completed.',
    });

    expect(setConfig).toHaveBeenCalledWith({
      'outlook.directory': 'C:\\Outlook',
      'ai.baseUrl': 'https://api.openai.com/v1',
      'ai.model': 'gpt-4.1-mini',
      'ai.apiKey': 'secret',
    });
    expect(setConfig).toHaveBeenCalledWith({
      'outlook.directory': 'C:\\New',
      'ai.baseUrl': 'https://example.com',
      'ai.model': 'gpt-4.1',
      'ai.apiKey': 'new-key',
    });
    expect(vacuum).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith('IPC', 'Registered active onboarding, runs, and settings handlers');
  });
});
