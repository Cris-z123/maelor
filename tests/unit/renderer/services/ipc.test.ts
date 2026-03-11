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

  describe('setOnboardingStep', () => {
    it('should update onboarding step with data', async () => {
      const mockData = {
        emailClient: { type: 'thunderbird' as const, path: '/path/to/thunderbird' }
      };

      mockOnboardingAPI.setStep = vi.fn().mockResolvedValue({
        success: true
      });

      const result = await ipcClient.setOnboardingStep(1, mockData);

      expect(result).toEqual({ success: true });
      expect(mockOnboardingAPI.setStep).toHaveBeenCalledWith({
        step: 1,
        data: mockData
      });
    });

    it('should handle errors gracefully', async () => {
      mockOnboardingAPI.setStep = vi.fn().mockRejectedValue(new Error('Update failed'));

      await expect(ipcClient.setOnboardingStep(1)).rejects.toThrow(
        'Onboarding set-step failed: Update failed'
      );
    });
  });

  describe('detectEmailClient', () => {
    it('should detect email client path', async () => {
      mockOnboardingAPI.detectEmailClient = vi.fn().mockResolvedValue({
        clients: [{ type: 'thunderbird', path: '/path/to/thunderbird', confidence: 'high' }],
        platform: 'linux'
      });

      const result = await ipcClient.detectEmailClient('thunderbird');

      expect(result).toEqual({
        clients: [{ type: 'thunderbird', path: '/path/to/thunderbird', confidence: 'high' }],
        platform: 'linux'
      });
      expect(mockOnboardingAPI.detectEmailClient).toHaveBeenCalledWith('thunderbird');
    });

    it('should return empty array when not detected', async () => {
      mockOnboardingAPI.detectEmailClient = vi.fn().mockResolvedValue({
        clients: [],
        platform: 'linux'
      });

      const result = await ipcClient.detectEmailClient('outlook');

      expect(result.clients).toEqual([]);
      expect(result.platform).toBe('linux');
    });
  });

  describe('validateEmailPath', () => {
    it('should validate email client path', async () => {
      mockOnboardingAPI.validateEmailPath = vi.fn().mockResolvedValue({
        valid: true,
        message: 'Valid path'
      });

      const result = await ipcClient.validateEmailPath('/valid/path');

      expect(result).toEqual({ valid: true, message: 'Valid path' });
    });

    it('should reject invalid paths', async () => {
      mockOnboardingAPI.validateEmailPath = vi.fn().mockResolvedValue({
        valid: false,
        message: 'No email files found'
      });

      const result = await ipcClient.validateEmailPath('/invalid/path');

      expect(result.valid).toBe(false);
    });
  });

  describe('testLLMConnection', () => {
    it('should test LLM connection successfully', async () => {
      mockOnboardingAPI.testLLMConnection = vi.fn().mockResolvedValue({
        success: true,
        responseTime: 150
      });

      const result = await ipcClient.testLLMConnection({
        mode: 'remote',
        remoteEndpoint: 'https://api.openai.com',
        apiKey: 'sk-test'
      });

      expect(result).toEqual({ success: true, responseTime: 150 });
    });

    it('should handle connection failures', async () => {
      mockOnboardingAPI.testLLMConnection = vi.fn().mockResolvedValue({
        success: false,
        responseTime: 0,
        error: 'Connection refused'
      });

      const result = await ipcClient.testLLMConnection({
        mode: 'local'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});
