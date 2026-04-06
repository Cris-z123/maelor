import { ipcMain } from 'electron';

import { ConfigManager } from '../config/ConfigManager.js';
import { logger } from '../config/logger.js';
import DatabaseManager from '../database/Database.js';
import OnboardingManager from '../onboarding/OnboardingManager.js';
import PstDiscovery from '../outlook/PstDiscovery.js';
import RunExecutionService from '../runs/RunExecutionService.js';
import RunRepository, { SETTINGS_CONFIG_KEYS } from '../runs/RunRepository.js';
import { IPC_CHANNELS } from './channels.js';
import {
    handleDetectEmailClient,
    handleGetStatus,
    handleTestConnection,
    handleValidateEmailPath,
} from './handlers/onboardingHandler.js';

export interface AppIpcDependencies {
    getOnboardingStatus: () => Promise<{
        completed: boolean;
        currentStep: 1 | 2 | 3;
        outlookDirectory: string | null;
        readablePstCount: number;
    }>;
    detectOutlookDirectory: () => Promise<{
        detectedPath: string | null;
        reason: string;
    }>;
    validateOutlookDirectory: (directoryPath: string) => Promise<{
        valid: boolean;
        readablePstCount: number;
        unreadablePstCount: number;
        files: Array<{
            path: string;
            fileName: string;
            sizeBytes: number;
            modifiedAt: number;
            readability: 'readable' | 'unreadable';
            reason: string | null;
        }>;
        message: string;
    }>;
    testConnection: (config: { baseUrl: string; apiKey: string; model: string }) => Promise<{
        success: boolean;
        responseTimeMs: number | null;
        message: string;
    }>;
    completeOnboarding: (request: {
        directoryPath: string;
        baseUrl: string;
        apiKey: string;
        model: string;
    }) => Promise<{ success: boolean; error?: string }>;
    startRun: () => Promise<{ success: boolean; runId: string | null; message: string }>;
    getLatestRun: () => Promise<unknown>;
    getRunById: (runId: string) => Promise<unknown>;
    listRecentRuns: (limit?: number) => Promise<unknown>;
    getSettings: () => Promise<{
        outlookDirectory: string;
        aiBaseUrl: string;
        aiModel: string;
    }>;
    updateSettings: (request: {
        updates?: {
            outlookDirectory?: string;
            aiBaseUrl?: string;
            apiKey?: string;
            aiModel?: string;
        };
    }) => Promise<{ success: boolean }>;
    getDataSummary: () => Promise<{
        outlookDirectory: string;
        aiBaseUrl: string;
        aiModel: string;
        databasePath: string;
        databaseSizeBytes: number;
    }>;
    clearRuns: () => Promise<{ success: boolean; deletedRunCount: number }>;
    rebuildIndex: () => Promise<{ success: boolean; message: string }>;
}

export const ACTIVE_IPC_CHANNELS = [
    IPC_CHANNELS.ONBOARDING_GET_STATUS,
    IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT,
    IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH,
    IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION,
    IPC_CHANNELS.ONBOARDING_COMPLETE_SETUP,
    IPC_CHANNELS.RUNS_START,
    IPC_CHANNELS.RUNS_GET_LATEST,
    IPC_CHANNELS.RUNS_GET_BY_ID,
    IPC_CHANNELS.RUNS_LIST_RECENT,
    IPC_CHANNELS.SETTINGS_GET_ALL,
    IPC_CHANNELS.SETTINGS_UPDATE,
    IPC_CHANNELS.SETTINGS_GET_DATA_SUMMARY,
    IPC_CHANNELS.SETTINGS_CLEAR_RUNS,
    IPC_CHANNELS.SETTINGS_REBUILD_INDEX,
] as const;

function getDefaultDependencies(): AppIpcDependencies {
    const runExecutionService = new RunExecutionService();

    return {
        getOnboardingStatus: async () => handleGetStatus({} as Electron.IpcMainInvokeEvent),
        detectOutlookDirectory: async () =>
            handleDetectEmailClient({} as Electron.IpcMainInvokeEvent),
        validateOutlookDirectory: async (directoryPath) =>
            handleValidateEmailPath({} as Electron.IpcMainInvokeEvent, directoryPath),
        testConnection: async (config) =>
            handleTestConnection({} as Electron.IpcMainInvokeEvent, config),
        completeOnboarding: async (request) => {
            const validation = PstDiscovery.validateDirectory(request.directoryPath);
            if (!validation.valid) {
                return { success: false, error: validation.message };
            }

            await ConfigManager.set({
                [SETTINGS_CONFIG_KEYS.outlookDirectory]: request.directoryPath,
                [SETTINGS_CONFIG_KEYS.aiBaseUrl]: request.baseUrl,
                [SETTINGS_CONFIG_KEYS.aiModel]: request.model,
                'ai.apiKey': request.apiKey,
            });

            OnboardingManager.completeSetup({
                directoryPath: request.directoryPath,
                baseUrl: request.baseUrl,
                apiKey: request.apiKey,
                model: request.model,
                readablePstCount: validation.readablePstCount,
            });

            return { success: true };
        },
        startRun: async () => {
            return runExecutionService.start();
        },
        getLatestRun: async () => RunRepository.getLatest(),
        getRunById: async (runId) => RunRepository.getById(runId),
        listRecentRuns: async (limit) => RunRepository.listRecent(limit ?? 20),
        getSettings: async () => {
            const seed = await RunRepository.getSettingsSeed();
            return {
                outlookDirectory: seed.outlookDirectory,
                aiBaseUrl: seed.aiBaseUrl,
                aiModel: seed.aiModel,
            };
        },
        updateSettings: async (request) => {
            await ConfigManager.set({
                ...(typeof request?.updates?.outlookDirectory === 'string'
                    ? { [SETTINGS_CONFIG_KEYS.outlookDirectory]: request.updates.outlookDirectory }
                    : {}),
                ...(typeof request?.updates?.aiBaseUrl === 'string'
                    ? { [SETTINGS_CONFIG_KEYS.aiBaseUrl]: request.updates.aiBaseUrl }
                    : {}),
                ...(typeof request?.updates?.aiModel === 'string'
                    ? { [SETTINGS_CONFIG_KEYS.aiModel]: request.updates.aiModel }
                    : {}),
                ...(typeof request?.updates?.apiKey === 'string'
                    ? { 'ai.apiKey': request.updates.apiKey }
                    : {}),
            });

            return { success: true };
        },
        getDataSummary: async () => {
            const seed = await RunRepository.getSettingsSeed();
            return {
                outlookDirectory: seed.outlookDirectory,
                aiBaseUrl: seed.aiBaseUrl,
                aiModel: seed.aiModel,
                databasePath: DatabaseManager.getPath(),
                databaseSizeBytes: DatabaseManager.getSize(),
            };
        },
        clearRuns: async () => {
            const deletedRunCount = await RunRepository.clearRuns();
            return { success: true, deletedRunCount };
        },
        rebuildIndex: async () => {
            DatabaseManager.vacuum();
            return { success: true, message: 'Index rebuild completed.' };
        },
    };
}

export async function registerAppIpcHandlers(
    overrides: Partial<AppIpcDependencies> = {},
): Promise<void> {
    const deps = { ...getDefaultDependencies(), ...overrides };

    for (const channel of ACTIVE_IPC_CHANNELS) {
        ipcMain.removeHandler(channel);
    }

    ipcMain.handle(IPC_CHANNELS.ONBOARDING_GET_STATUS, async () => deps.getOnboardingStatus());
    ipcMain.handle(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT, async () =>
        deps.detectOutlookDirectory(),
    );
    ipcMain.handle(
        IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH,
        async (_event, directoryPath: string) => deps.validateOutlookDirectory(directoryPath),
    );
    ipcMain.handle(
        IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION,
        async (_event, config: Parameters<AppIpcDependencies['testConnection']>[0]) =>
            deps.testConnection(config),
    );
    ipcMain.handle(
        IPC_CHANNELS.ONBOARDING_COMPLETE_SETUP,
        async (_event, request: Parameters<AppIpcDependencies['completeOnboarding']>[0]) =>
            deps.completeOnboarding(request),
    );
    ipcMain.handle(IPC_CHANNELS.RUNS_START, async () => deps.startRun());
    ipcMain.handle(IPC_CHANNELS.RUNS_GET_LATEST, async () => deps.getLatestRun());
    ipcMain.handle(IPC_CHANNELS.RUNS_GET_BY_ID, async (_event, request: { runId: string }) =>
        deps.getRunById(request.runId),
    );
    ipcMain.handle(IPC_CHANNELS.RUNS_LIST_RECENT, async (_event, request?: { limit?: number }) =>
        deps.listRecentRuns(request?.limit),
    );
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => deps.getSettings());
    ipcMain.handle(
        IPC_CHANNELS.SETTINGS_UPDATE,
        async (_event, request: Parameters<AppIpcDependencies['updateSettings']>[0]) =>
            deps.updateSettings(request),
    );
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DATA_SUMMARY, async () => deps.getDataSummary());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_CLEAR_RUNS, async () => deps.clearRuns());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_REBUILD_INDEX, async () => deps.rebuildIndex());

    logger.info('IPC', 'Registered active onboarding, runs, and settings handlers');
}
