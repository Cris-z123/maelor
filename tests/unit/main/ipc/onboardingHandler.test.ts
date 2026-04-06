import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/config/logger';
import {
    handleDetectEmailClient,
    handleGetStatus,
    handleTestConnection,
    handleValidateEmailPath,
} from '@/ipc/handlers/onboardingHandler';
import OnboardingManager from '@/onboarding/OnboardingManager';
import PstDiscovery from '@/outlook/PstDiscovery';

describe('onboardingHandler', () => {
    it('maps onboarding status for the renderer contract', async () => {
        vi.spyOn(OnboardingManager, 'getState').mockReturnValue({
            completed: false,
            currentStep: 2,
            outlookDirectory: '',
            detectedOutlookDirectory: null,
            readablePstCount: 3,
            ai: {
                baseUrl: 'https://api.openai.com/v1',
                apiKey: '',
                model: 'gpt-4.1-mini',
                connectionStatus: 'untested',
                responseTimeMs: null,
            },
            lastUpdated: 1,
        });

        await expect(handleGetStatus({} as Electron.IpcMainInvokeEvent)).resolves.toEqual({
            completed: false,
            currentStep: 2,
            readablePstCount: 3,
            outlookDirectory: null,
        });
    });

    it('detects the Outlook directory and logs success', async () => {
        const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
        vi.spyOn(OnboardingManager, 'detectOutlookDirectory').mockReturnValue({
            detectedPath: 'C:\\Outlook',
            reason: 'found',
        });

        await expect(handleDetectEmailClient({} as Electron.IpcMainInvokeEvent)).resolves.toEqual({
            detectedPath: 'C:\\Outlook',
            reason: 'found',
        });
        expect(info).toHaveBeenCalledTimes(2);
    });

    it('logs and rethrows detect errors', async () => {
        const error = new Error('boom');
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
        vi.spyOn(OnboardingManager, 'detectOutlookDirectory').mockImplementation(() => {
            throw error;
        });

        await expect(handleDetectEmailClient({} as Electron.IpcMainInvokeEvent)).rejects.toThrow(
            'boom',
        );
        expect(errorSpy).toHaveBeenCalledWith(
            'OnboardingHandler',
            'Detect Outlook directory failed',
            {
                error: 'boom',
            },
        );
    });

    it('validates the selected PST path and records the result', async () => {
        const result = {
            valid: true,
            readablePstCount: 2,
            unreadablePstCount: 1,
            files: [],
            message: 'ok',
        };
        vi.spyOn(PstDiscovery, 'validateDirectory').mockReturnValue(result);
        const recordValidation = vi
            .spyOn(OnboardingManager, 'recordValidation')
            .mockReturnValue({} as never);

        await expect(
            handleValidateEmailPath({} as Electron.IpcMainInvokeEvent, 'C:\\Outlook'),
        ).resolves.toEqual(result);
        expect(recordValidation).toHaveBeenCalledWith('C:\\Outlook', 2);
    });

    it('rejects invalid AI connection payloads', async () => {
        await expect(
            handleTestConnection({} as Electron.IpcMainInvokeEvent, {
                baseUrl: '',
                apiKey: 'key',
                model: 'gpt-4.1-mini',
            }),
        ).rejects.toThrow('Invalid AI configuration');
    });

    it('delegates valid AI connection tests to OnboardingManager', async () => {
        vi.spyOn(OnboardingManager, 'testConnection').mockResolvedValue({
            success: true,
            responseTimeMs: 123,
            message: 'connected',
        });

        await expect(
            handleTestConnection({} as Electron.IpcMainInvokeEvent, {
                baseUrl: 'https://api.openai.com/v1',
                apiKey: 'key',
                model: 'gpt-4.1-mini',
            }),
        ).resolves.toEqual({
            success: true,
            responseTimeMs: 123,
            message: 'connected',
        });
    });
});
