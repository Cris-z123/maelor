/**
 * IPC Client Unit Tests
 * Test coverage for type-safe IPC communication layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import IPCClient from '@renderer/services/ipc';

describe('IPCClient - Onboarding Channels', () => {
  let ipcClient: IPCClient;
  let mockOnboardingAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.electronAPI
    mockOnboardingAPI = {
      getStatus: vi.fn().mockResolvedValue({
        completed: false,
        currentStep: 1,
        canProceed: true
      })
    };

    const mockElectronAPI: any = {
      onboarding: mockOnboardingAPI,
      llm: {
        generate: vi.fn()
      },
      db: {
        queryHistory: vi.fn(),
        export: vi.fn()
      },
      config: {
        get: vi.fn(),
        set: vi.fn()
      },
      app: {
        checkUpdate: vi.fn()
      },
      email: {
        fetchMeta: vi.fn()
      }
    };

    // Create IPCClient with mock API
    ipcClient = new IPCClient(mockElectronAPI);
  });

  describe('getOnboardingStatus', () => {
    it('should return onboarding status', async () => {
      const status = await ipcClient.getOnboardingStatus();

      expect(status).toEqual({
        completed: false,
        currentStep: 1,
        canProceed: true
      });
    });

    it('should handle IPC errors gracefully', async () => {
      mockOnboardingAPI.getStatus.mockRejectedValue(
        new Error('IPC channel failed')
      );

      await expect(ipcClient.getOnboardingStatus()).rejects.toThrow(
        'Onboarding get-status failed: IPC channel failed'
      );
    });
  });
});
