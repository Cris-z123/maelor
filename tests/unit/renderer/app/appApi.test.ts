import { afterEach, describe, expect, it } from 'vitest';

import { appApi } from '@renderer/app/appApi';

type ElectronApi = NonNullable<typeof window.electronAPI>;

function setElectronApi(value: typeof window.electronAPI): void {
    Object.defineProperty(window, 'electronAPI', {
        configurable: true,
        writable: true,
        value,
    });
}

describe('appApi', () => {
    const originalApi = window.electronAPI;

    afterEach(() => {
        setElectronApi(originalApi);
    });

    it('returns safe fallback values when the Electron API is unavailable', async () => {
        setElectronApi(undefined);

        await expect(appApi.getOnboardingStatus()).resolves.toEqual({
            completed: false,
            currentStep: 1,
            readablePstCount: 0,
            outlookDirectory: null,
        });
        await expect(appApi.detectOutlookDirectory()).resolves.toBeNull();
        await expect(appApi.validateOutlookDirectory('C:\\Outlook')).resolves.toEqual({
            valid: false,
            readablePstCount: 0,
            unreadablePstCount: 0,
            files: [],
            message: expect.stringContaining('Electron API'),
        });
        await expect(
            appApi.testConnection('https://api.openai.com/v1', 'key', 'gpt-4.1-mini'),
        ).resolves.toEqual({
            success: false,
            responseTimeMs: null,
            message: expect.stringContaining('Electron API'),
        });
        await expect(
            appApi.completeSetup({
                directoryPath: 'C:\\Outlook',
                baseUrl: 'https://api.openai.com/v1',
                apiKey: 'key',
                model: 'gpt-4.1-mini',
            }),
        ).resolves.toEqual({
            success: false,
            error: expect.stringContaining('Electron API'),
        });
        await expect(appApi.startRun()).resolves.toEqual({
            success: false,
            runId: null,
            message: expect.stringContaining('Electron API'),
        });
        await expect(appApi.getLatestRun()).resolves.toBeNull();
        await expect(appApi.getRunById('run-1')).resolves.toBeNull();
        await expect(appApi.listRecentRuns()).resolves.toEqual([]);
        await expect(appApi.getSettingsSummary()).resolves.toEqual({
            outlookDirectory: '',
            aiBaseUrl: '',
            aiModel: '',
            databasePath: '',
            databaseSizeBytes: 0,
        });
        await expect(appApi.updateSettings({ aiModel: 'gpt-4.1-mini' })).resolves.toBe(false);
        await expect(appApi.clearRuns()).resolves.toEqual({
            success: false,
            deletedRunCount: 0,
        });
        await expect(appApi.rebuildIndex()).resolves.toEqual({
            success: false,
            message: expect.stringContaining('Electron API'),
        });
    });

    it('delegates to the Electron API with the expected request shapes', async () => {
        const electronApi = {
            onboarding: {
                getStatus: async () => ({
                    completed: true,
                    currentStep: 3,
                    readablePstCount: 1,
                    outlookDirectory: 'C:\\Outlook',
                }),
                detectOutlookDir: async () => ({ detectedPath: 'C:\\Outlook', reason: 'found' }),
                validateOutlookDir: async ({ directoryPath }: { directoryPath: string }) => ({
                    valid: true,
                    readablePstCount: 1,
                    unreadablePstCount: 0,
                    files: [{ path: directoryPath }],
                    message: 'ok',
                }),
                testLLMConnection: async (payload: {
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                }) => ({
                    success: true,
                    responseTimeMs: 120,
                    message: `${payload.model}:ok`,
                }),
                complete: async (payload: {
                    directoryPath: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                }) => ({
                    success: payload.directoryPath.length > 0,
                }),
            },
            runs: {
                start: async () => ({ success: true, runId: 'run-1', message: 'started' }),
                getLatest: async () => ({ runId: 'run-latest' }),
                getById: async ({ runId }: { runId: string }) => ({ runId }),
                listRecent: async ({ limit }: { limit: number }) => [{ runId: `limit-${limit}` }],
            },
            settings: {
                getDataSummary: async () => ({
                    outlookDirectory: 'C:\\Outlook',
                    aiBaseUrl: 'https://api.openai.com/v1',
                    aiModel: 'gpt-4.1-mini',
                    databasePath: 'D:\\app.db',
                    databaseSizeBytes: 128,
                }),
                update: async (updates: unknown) => ({ success: Boolean(updates) }),
                clearRuns: async () => ({ success: true, deletedRunCount: 3 }),
                rebuildIndex: async () => ({ success: true, message: 'rebuilt' }),
            },
        } as ElectronApi;
        setElectronApi(electronApi);

        await expect(appApi.getOnboardingStatus()).resolves.toEqual({
            completed: true,
            currentStep: 3,
            readablePstCount: 1,
            outlookDirectory: 'C:\\Outlook',
        });
        await expect(appApi.detectOutlookDirectory()).resolves.toBe('C:\\Outlook');
        await expect(appApi.validateOutlookDirectory('C:\\Outlook')).resolves.toEqual({
            valid: true,
            readablePstCount: 1,
            unreadablePstCount: 0,
            files: [{ path: 'C:\\Outlook' }],
            message: 'ok',
        });
        await expect(
            appApi.testConnection('https://api.openai.com/v1', 'key', 'gpt-4.1-mini'),
        ).resolves.toEqual({
            success: true,
            responseTimeMs: 120,
            message: 'gpt-4.1-mini:ok',
        });
        await expect(
            appApi.completeSetup({
                directoryPath: 'C:\\Outlook',
                baseUrl: 'https://api.openai.com/v1',
                apiKey: 'key',
                model: 'gpt-4.1-mini',
            }),
        ).resolves.toEqual({ success: true });
        await expect(appApi.startRun()).resolves.toEqual({
            success: true,
            runId: 'run-1',
            message: 'started',
        });
        await expect(appApi.getLatestRun()).resolves.toEqual({ runId: 'run-latest' });
        await expect(appApi.getRunById('run-7')).resolves.toEqual({ runId: 'run-7' });
        await expect(appApi.listRecentRuns()).resolves.toEqual([{ runId: 'limit-20' }]);
        await expect(appApi.getSettingsSummary()).resolves.toEqual({
            outlookDirectory: 'C:\\Outlook',
            aiBaseUrl: 'https://api.openai.com/v1',
            aiModel: 'gpt-4.1-mini',
            databasePath: 'D:\\app.db',
            databaseSizeBytes: 128,
        });
        await expect(
            appApi.updateSettings({ aiModel: 'gpt-4.1-mini', apiKey: 'new-key' }),
        ).resolves.toBe(true);
        await expect(appApi.clearRuns()).resolves.toEqual({
            success: true,
            deletedRunCount: 3,
        });
        await expect(appApi.rebuildIndex()).resolves.toEqual({
            success: true,
            message: 'rebuilt',
        });
    });
});
