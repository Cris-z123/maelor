/**
 * Tests for onboardingStore
 *
 * Per T022, Task 5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onboardingStore } from '@renderer/stores/onboardingStore';
import { ipcClient } from '@renderer/services/ipc';

// Mock IPC client
vi.mock('@renderer/services/ipc', () => ({
  ipcClient: {
    detectEmailClient: vi.fn(),
    validateEmailPath: vi.fn(),
    testLLMConnection: vi.fn(),
    setOnboardingStep: vi.fn(),
  },
}));

describe('onboardingStore', () => {
  beforeEach(() => {
    // Reset store before each test
    onboardingStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default initial state', () => {
      const state = onboardingStore.getState();

      expect(state.currentStep).toBe(1);
      expect(state.isComplete).toBe(false);
      expect(state.emailClient.type).toBe('thunderbird');
      expect(state.schedule.hour).toBe(18);
      expect(state.schedule.minute).toBe(0);
      expect(state.llm.mode).toBe('remote');
    });

    it('should have empty email client path by default', () => {
      const state = onboardingStore.getState();

      expect(state.emailClient.path).toBe('');
      expect(state.emailClient.detectedPath).toBeNull();
      expect(state.emailClient.isValid).toBe(false);
    });

    it('should have idle connection status by default', () => {
      const state = onboardingStore.getState();

      expect(state.llm.connectionStatus).toBe('idle');
      expect(state.llm.isTesting).toBe(false);
    });
  });

  describe('setCurrentStep', () => {
    it('should set current step', () => {
      const { setCurrentStep } = onboardingStore.getState();

      setCurrentStep(2);

      const state = onboardingStore.getState();
      expect(state.currentStep).toBe(2);
    });

    it('should set step to 3', () => {
      const { setCurrentStep } = onboardingStore.getState();

      setCurrentStep(3);

      const state = onboardingStore.getState();
      expect(state.currentStep).toBe(3);
    });
  });

  describe('setEmailClientType', () => {
    it('should set email client type to outlook', () => {
      const { setEmailClientType } = onboardingStore.getState();

      setEmailClientType('outlook');

      const state = onboardingStore.getState();
      expect(state.emailClient.type).toBe('outlook');
    });

    it('should set email client type to apple-mail', () => {
      const { setEmailClientType } = onboardingStore.getState();

      setEmailClientType('apple-mail');

      const state = onboardingStore.getState();
      expect(state.emailClient.type).toBe('apple-mail');
    });
  });

  describe('setEmailClientPath', () => {
    it('should set email client path', () => {
      const { setEmailClientPath } = onboardingStore.getState();
      const testPath = 'C:\\Program Files\\Thunderbird';

      setEmailClientPath(testPath);

      const state = onboardingStore.getState();
      expect(state.emailClient.path).toBe(testPath);
    });
  });

  describe('detectEmailClient', () => {
    it('should detect email client successfully', async () => {
      const { detectEmailClient } = onboardingStore.getState();

      vi.mocked(ipcClient.detectEmailClient).mockResolvedValue({
        clients: [{ type: 'thunderbird', path: 'C:\\Program Files\\Thunderbird', confidence: 'high' }],
        platform: 'win32'
      });

      await detectEmailClient();

      const state = onboardingStore.getState();
      expect(state.emailClient.detectedPath).toBe('C:\\Program Files\\Thunderbird');
      expect(state.emailClient.isDetecting).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle detection failure when no client found', async () => {
      const { detectEmailClient } = onboardingStore.getState();

      vi.mocked(ipcClient.detectEmailClient).mockResolvedValue({
        clients: [],
        platform: 'win32'
      });

      await detectEmailClient();

      const state = onboardingStore.getState();
      expect(state.emailClient.detectedPath).toBeNull();
      expect(state.emailClient.isDetecting).toBe(false);
      expect(state.error).toBe('No thunderbird installation detected on win32');
    });

    it('should handle detection errors', async () => {
      const { detectEmailClient } = onboardingStore.getState();

      vi.mocked(ipcClient.detectEmailClient).mockRejectedValue(
        new Error('Detection failed')
      );

      await detectEmailClient();

      const state = onboardingStore.getState();
      expect(state.emailClient.isDetecting).toBe(false);
      expect(state.error).toBe('Detection failed');
    });

    it('should set isDetecting to true during detection', async () => {
      const { detectEmailClient } = onboardingStore.getState();

      // Mock with delay to check intermediate state
      vi.mocked(ipcClient.detectEmailClient).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  clients: [{ type: 'thunderbird', path: 'C:\\Program Files\\Thunderbird', confidence: 'high' }],
                  platform: 'win32'
                }),
              10
            );
          })
      );

      const promise = detectEmailClient();

      // Check intermediate state
      expect(onboardingStore.getState().emailClient.isDetecting).toBe(true);

      await promise;

      // Check final state
      expect(onboardingStore.getState().emailClient.isDetecting).toBe(false);
    });
  });

  describe('validateEmailPath', () => {
    it('should validate email path successfully', async () => {
      const { validateEmailPath } = onboardingStore.getState();

      vi.mocked(ipcClient.validateEmailPath).mockResolvedValue({
        valid: true,
        message: 'Valid path',
      });

      const result = await validateEmailPath('C:\\Thunderbird');

      expect(result).toBe(true);
      expect(onboardingStore.getState().emailClient.isValid).toBe(true);
      expect(onboardingStore.getState().emailClient.path).toBe('C:\\Thunderbird');
      expect(onboardingStore.getState().error).toBeNull();
    });

    it('should handle invalid path', async () => {
      const { validateEmailPath } = onboardingStore.getState();

      vi.mocked(ipcClient.validateEmailPath).mockResolvedValue({
        valid: false,
        message: 'Invalid email client path',
      });

      const result = await validateEmailPath('C:\\Invalid');

      expect(result).toBe(false);
      expect(onboardingStore.getState().emailClient.isValid).toBe(false);
      expect(onboardingStore.getState().error).toBe('Invalid email client path');
    });

    it('should handle validation errors', async () => {
      const { validateEmailPath } = onboardingStore.getState();

      vi.mocked(ipcClient.validateEmailPath).mockRejectedValue(
        new Error('Validation failed')
      );

      const result = await validateEmailPath('C:\\Thunderbird');

      expect(result).toBe(false);
      expect(onboardingStore.getState().emailClient.isValid).toBe(false);
      expect(onboardingStore.getState().error).toBe('Validation failed');
    });
  });

  describe('setScheduleTime', () => {
    it('should set schedule time', () => {
      const { setScheduleTime } = onboardingStore.getState();

      setScheduleTime(20, 30);

      const state = onboardingStore.getState();
      expect(state.schedule.hour).toBe(20);
      expect(state.schedule.minute).toBe(30);
    });

    it('should set schedule time to 0:00', () => {
      const { setScheduleTime } = onboardingStore.getState();

      setScheduleTime(0, 0);

      const state = onboardingStore.getState();
      expect(state.schedule.hour).toBe(0);
      expect(state.schedule.minute).toBe(0);
    });
  });

  describe('setSkipWeekends', () => {
    it('should set skip weekends to true', () => {
      const { setSkipWeekends } = onboardingStore.getState();

      setSkipWeekends(true);

      const state = onboardingStore.getState();
      expect(state.schedule.skipWeekends).toBe(true);
    });

    it('should set skip weekends to false', () => {
      const { setSkipWeekends } = onboardingStore.getState();

      setSkipWeekends(false);

      const state = onboardingStore.getState();
      expect(state.schedule.skipWeekends).toBe(false);
    });
  });

  describe('setLLMMode', () => {
    it('should set LLM mode to local', () => {
      const { setLLMMode } = onboardingStore.getState();

      setLLMMode('local');

      const state = onboardingStore.getState();
      expect(state.llm.mode).toBe('local');
      expect(state.llm.connectionStatus).toBe('idle');
    });

    it('should set LLM mode to remote', () => {
      const { setLLMMode } = onboardingStore.getState();

      setLLMMode('remote');

      const state = onboardingStore.getState();
      expect(state.llm.mode).toBe('remote');
      expect(state.llm.connectionStatus).toBe('idle');
    });
  });

  describe('setLLMEndpoint', () => {
    it('should set local endpoint when mode is local', () => {
      const { setLLMMode, setLLMEndpoint } = onboardingStore.getState();

      setLLMMode('local');
      setLLMEndpoint('http://localhost:8080');

      const state = onboardingStore.getState();
      expect(state.llm.localEndpoint).toBe('http://localhost:8080');
    });

    it('should set remote endpoint when mode is remote', () => {
      const { setLLMMode, setLLMEndpoint } = onboardingStore.getState();

      setLLMMode('remote');
      setLLMEndpoint('https://api.anthropic.com/v1');

      const state = onboardingStore.getState();
      expect(state.llm.remoteEndpoint).toBe('https://api.anthropic.com/v1');
    });
  });

  describe('setAPIKey', () => {
    it('should set API key', () => {
      const { setAPIKey } = onboardingStore.getState();
      const testKey = 'sk-test-key-with-at-least-20-chars';

      setAPIKey(testKey);

      const state = onboardingStore.getState();
      expect(state.llm.apiKey).toBe(testKey);
    });
  });

  describe('testLLMConnection', () => {
    it('should test LLM connection successfully', async () => {
      const { testLLMConnection, setAPIKey } = onboardingStore.getState();

      setAPIKey('sk-test-key-with-at-least-20-chars');

      vi.mocked(ipcClient.testLLMConnection).mockResolvedValue({
        success: true,
        responseTime: 234,
      });

      await testLLMConnection();

      const state = onboardingStore.getState();
      expect(state.llm.connectionStatus).toBe('success');
      expect(state.llm.responseTime).toBe(234);
      expect(state.llm.isTesting).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle connection test failure', async () => {
      const { testLLMConnection, setAPIKey } = onboardingStore.getState();

      setAPIKey('sk-invalid-key');

      vi.mocked(ipcClient.testLLMConnection).mockResolvedValue({
        success: false,
        responseTime: 0,
        error: 'Authentication failed',
      });

      await testLLMConnection();

      const state = onboardingStore.getState();
      expect(state.llm.connectionStatus).toBe('failed');
      expect(state.llm.isTesting).toBe(false);
      expect(state.error).toBe('Authentication failed');
    });

    it('should handle connection test errors', async () => {
      const { testLLMConnection } = onboardingStore.getState();

      vi.mocked(ipcClient.testLLMConnection).mockRejectedValue(
        new Error('Network error')
      );

      await testLLMConnection();

      const state = onboardingStore.getState();
      expect(state.llm.connectionStatus).toBe('failed');
      expect(state.llm.isTesting).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should set isTesting to true during test', async () => {
      const { testLLMConnection } = onboardingStore.getState();

      vi.mocked(ipcClient.testLLMConnection).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  responseTime: 100,
                }),
              10
            );
          })
      );

      const promise = testLLMConnection();

      // Check intermediate state
      expect(onboardingStore.getState().llm.isTesting).toBe(true);
      expect(onboardingStore.getState().llm.connectionStatus).toBe('testing');

      await promise;

      // Check final state
      expect(onboardingStore.getState().llm.isTesting).toBe(false);
    });
  });

  describe('completeOnboarding', () => {
    it('should complete onboarding successfully', async () => {
      const { completeOnboarding, setEmailClientPath } = onboardingStore.getState();

      setEmailClientPath('C:\\Thunderbird');

      vi.mocked(ipcClient.setOnboardingStep).mockResolvedValue({
        success: true,
      });

      await completeOnboarding();

      const state = onboardingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isComplete).toBe(true);
      expect(state.error).toBeNull();
      expect(ipcClient.setOnboardingStep).toHaveBeenCalledWith(3, {
        emailClient: {
          type: 'thunderbird',
          path: 'C:\\Thunderbird',
        },
        schedule: {
          generationTime: {
            hour: 18,
            minute: 0,
          },
          skipWeekends: true,
        },
        llm: {
          mode: 'remote',
          localEndpoint: 'http://localhost:11434',
          remoteEndpoint: 'https://api.openai.com/v1',
          apiKey: '',
        },
      });
    });

    it('should handle completion errors', async () => {
      const { completeOnboarding } = onboardingStore.getState();

      vi.mocked(ipcClient.setOnboardingStep).mockRejectedValue(
        new Error('Failed to save')
      );

      await completeOnboarding();

      const state = onboardingStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isComplete).toBe(false);
      expect(state.error).toBe('Failed to save');
    });

    it('should set isLoading to true during completion', async () => {
      const { completeOnboarding } = onboardingStore.getState();

      vi.mocked(ipcClient.setOnboardingStep).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                }),
              10
            );
          })
      );

      const promise = completeOnboarding();

      // Check intermediate state
      expect(onboardingStore.getState().isLoading).toBe(true);

      await promise;

      // Check final state
      expect(onboardingStore.getState().isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to default state', () => {
      const { setCurrentStep, setEmailClientPath, reset } = onboardingStore.getState();

      // Modify state
      setCurrentStep(3);
      setEmailClientPath('C:\\Custom\\Path');

      expect(onboardingStore.getState().currentStep).toBe(3);
      expect(onboardingStore.getState().emailClient.path).toBe('C:\\Custom\\Path');

      // Reset
      reset();

      expect(onboardingStore.getState().currentStep).toBe(1);
      expect(onboardingStore.getState().emailClient.path).toBe('');
      expect(onboardingStore.getState().emailClient.type).toBe('thunderbird');
    });

    it('should clear errors on reset', async () => {
      const { validateEmailPath, reset } = onboardingStore.getState();

      // Create an error state
      vi.mocked(ipcClient.validateEmailPath).mockResolvedValue({
        valid: false,
        message: 'Invalid path',
      });

      await validateEmailPath('invalid');

      expect(onboardingStore.getState().error).toBe('Invalid path');

      // Reset
      reset();

      expect(onboardingStore.getState().error).toBeNull();
    });

    it('should clear isComplete on reset', async () => {
      const { reset, completeOnboarding } = onboardingStore.getState();

      // Mark as complete
      vi.mocked(ipcClient.setOnboardingStep).mockResolvedValue({
        success: true,
      });

      await completeOnboarding();
      expect(onboardingStore.getState().isComplete).toBe(true);

      // Reset
      reset();

      expect(onboardingStore.getState().isComplete).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full onboarding flow', async () => {
      const {
        setEmailClientType,
        detectEmailClient,
        validateEmailPath,
        setScheduleTime,
        setSkipWeekends,
        setLLMMode,
        setAPIKey,
        testLLMConnection,
        completeOnboarding,
      } = onboardingStore.getState();

      // Step 1: Email client
      setEmailClientType('outlook');

      vi.mocked(ipcClient.detectEmailClient).mockResolvedValue({
        clients: [{ type: 'outlook', path: 'C:\\Program Files\\Outlook', confidence: 'high' }],
        platform: 'win32'
      });
      await detectEmailClient();

      vi.mocked(ipcClient.validateEmailPath).mockResolvedValue({
        valid: true,
        message: 'Valid path',
      });
      await validateEmailPath('C:\\Program Files\\Outlook');

      // Step 2: Schedule
      setScheduleTime(19, 30);
      setSkipWeekends(false);

      // Step 3: LLM
      setLLMMode('remote');
      setAPIKey('sk-test-key-with-at-least-20-chars');

      vi.mocked(ipcClient.testLLMConnection).mockResolvedValue({
        success: true,
        responseTime: 150,
      });
      await testLLMConnection();

      // Complete
      vi.mocked(ipcClient.setOnboardingStep).mockResolvedValue({
        success: true,
      });
      await completeOnboarding();

      // Verify final state
      const state = onboardingStore.getState();
      expect(state.emailClient.type).toBe('outlook');
      expect(state.emailClient.isValid).toBe(true);
      expect(state.schedule.hour).toBe(19);
      expect(state.schedule.minute).toBe(30);
      expect(state.schedule.skipWeekends).toBe(false);
      expect(state.llm.mode).toBe('remote');
      expect(state.llm.connectionStatus).toBe('success');
      expect(state.llm.responseTime).toBe(150);
      expect(state.isComplete).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle errors and allow retry', async () => {
      const { detectEmailClient } = onboardingStore.getState();

      // First attempt fails
      vi.mocked(ipcClient.detectEmailClient).mockRejectedValueOnce(
        new Error('Detection failed')
      );

      await detectEmailClient();

      expect(onboardingStore.getState().error).toBe('Detection failed');

      // Second attempt succeeds
      vi.mocked(ipcClient.detectEmailClient).mockResolvedValueOnce({
        clients: [{ type: 'thunderbird', path: 'C:\\Thunderbird', confidence: 'high' }],
        platform: 'win32'
      });

      await detectEmailClient();

      expect(onboardingStore.getState().emailClient.detectedPath).toBe('C:\\Thunderbird');
      expect(onboardingStore.getState().error).toBeNull();
    });
  });
});
