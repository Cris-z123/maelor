/**
 * Verification Tests for OnboardingManager (T011)
 *
 * Tests the onboarding state management implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { app } from 'electron';

// Mock DatabaseManager before importing OnboardingManager
let mockState: any = null;
vi.mock('@/database/Database', () => {
  const mockDb = {
    prepare: vi.fn(() => ({
      get: vi.fn(() => mockState),
      run: vi.fn(),
    })),
  };
  return {
    default: {
      getDatabase: vi.fn(() => mockDb),
    },
  };
});

// Mock Electron safeStorage
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plaintext: string) => {
      const state = JSON.parse(plaintext);
      mockState = Buffer.from(`encrypted:${plaintext}`);
      return mockState;
    }),
    decryptString: vi.fn((encrypted: Buffer) => {
      const data = encrypted.toString();
      if (data.startsWith('encrypted:')) {
        return data.replace('encrypted:', '');
      }
      return data;
    }),
  },
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/tmp/test-userdata';
      if (name === 'home') return '/tmp/test-home';
      return '/tmp/test';
    }),
  },
}));

// Mock ConnectionTester
vi.mock('@/llm/ConnectionTester', () => ({
  ConnectionTester: {
    testConnection: vi.fn(),
  },
}));

import OnboardingManager from '@/onboarding/OnboardingManager';

describe('T011: OnboardingManager Implementation', () => {
  beforeEach(() => {
    // Reset mocks and state before each test
    mockState = null;
    vi.clearAllMocks();
  });

  describe('State Management', () => {
    it('should return default state when no config exists', () => {
      const state = OnboardingManager.getState();

      expect(state.completed).toBe(false);
      expect(state.currentStep).toBe(1);
      expect(state.emailClient.validated).toBe(false);
      expect(state.llm.connectionStatus).toBe('untested');
    });

    it('should persist state to database', () => {
      const update = {
        currentStep: 2 as const,
        emailClient: {
          type: 'thunderbird' as const,
          path: '/test/path',
          detectedPath: null,
          validated: true,
        },
      };

      const updated = OnboardingManager.updateState(update);

      expect(updated.currentStep).toBe(2);
      expect(updated.emailClient.validated).toBe(true);
    });

    it('should load persisted state', () => {
      const update = {
        completed: true,
        currentStep: 3 as const,
        emailClient: {
          type: 'thunderbird' as const,
          path: '/test',
          detectedPath: null,
          validated: true,
        },
        llm: {
          mode: 'remote' as const,
          localEndpoint: 'http://localhost:11434',
          remoteEndpoint: 'https://api.openai.com/v1',
          apiKey: 'test',
          connectionStatus: 'success' as const,
        },
      };

      OnboardingManager.updateState(update);
      const loaded = OnboardingManager.getState();

      expect(loaded.completed).toBe(true);
      expect(loaded.currentStep).toBe(3);
    });
  });

  describe('Step Validation', () => {
    it('should reject moving backward from step 2 to step 1', () => {
      // First set up valid state at step 2
      OnboardingManager.updateState({
        currentStep: 2,
        emailClient: {
          type: 'thunderbird',
          path: '/test',
          detectedPath: null,
          validated: true,
        },
      });

      expect(() => {
        OnboardingManager.updateState({ currentStep: 1 });
      }).toThrow('Cannot move back');
    });

    it('should reject step 2 without email client validation', () => {
      expect(() => {
        OnboardingManager.updateState({
          currentStep: 2,
          emailClient: {
            type: 'thunderbird',
            path: '/test',
            detectedPath: null,
            validated: false,
          },
        });
      }).toThrow('Email client must be validated');
    });

    it('should validate schedule hour range (0-23)', () => {
      // First set up valid state at step 2
      OnboardingManager.updateState({
        currentStep: 2,
        emailClient: {
          type: 'thunderbird',
          path: '/test',
          detectedPath: null,
          validated: true,
        },
      });

      expect(() => {
        OnboardingManager.updateState({
          currentStep: 3,
          schedule: {
            generationTime: { hour: 25, minute: 0 },
            skipWeekends: true,
          },
        });
      }).toThrow('Invalid hour');
    });

    it('should validate schedule minute range (0-59)', () => {
      // First set up valid state at step 2
      OnboardingManager.updateState({
        currentStep: 2,
        emailClient: {
          type: 'thunderbird',
          path: '/test',
          detectedPath: null,
          validated: true,
        },
      });

      expect(() => {
        OnboardingManager.updateState({
          currentStep: 3,
          schedule: {
            generationTime: { hour: 18, minute: 60 },
            skipWeekends: true,
          },
        });
      }).toThrow('Invalid minute');
    });

    it('should reject completion without LLM success', () => {
      expect(() => {
        OnboardingManager.updateState({
          completed: true,
          llm: {
            mode: 'remote',
            localEndpoint: 'http://localhost:11434',
            remoteEndpoint: 'https://api.openai.com/v1',
            apiKey: '',
            connectionStatus: 'untested',
          },
        });
      }).toThrow('LLM connection must succeed');
    });
  });

  describe('LLM Connection Status', () => {
    it('should update LLM connection status', () => {
      const updated = OnboardingManager.updateLLMConnectionStatus('success', 150);

      expect(updated.llm.connectionStatus).toBe('success');
      expect(updated.llm.responseTime).toBe(150);
    });

    it('should mark as failed on connection failure', () => {
      const updated = OnboardingManager.updateLLMConnectionStatus('failed');

      expect(updated.llm.connectionStatus).toBe('failed');
    });
  });

  describe('Completion', () => {
    it('should complete onboarding after successful LLM test', () => {
      // Setup: step 3 with successful connection and validated email client
      OnboardingManager.updateState({
        currentStep: 3,
        emailClient: {
          type: 'thunderbird',
          path: '/test',
          detectedPath: null,
          validated: true,
        },
        schedule: {
          generationTime: { hour: 18, minute: 0 },
          skipWeekends: true,
        },
        llm: {
          mode: 'remote',
          localEndpoint: 'http://localhost:11434',
          remoteEndpoint: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          connectionStatus: 'success',
        },
      });

      const completed = OnboardingManager.completeOnboarding();

      expect(completed.completed).toBe(true);
      expect(completed.currentStep).toBe(3);
    });

    it('should return completion status', () => {
      expect(OnboardingManager.isComplete()).toBe(false);

      OnboardingManager.updateState({
        completed: true,
        emailClient: {
          type: 'thunderbird',
          path: '/test',
          detectedPath: null,
          validated: true,
        },
        llm: {
          mode: 'remote',
          localEndpoint: 'http://localhost:11434',
          remoteEndpoint: 'https://api.openai.com/v1',
          apiKey: 'test',
          connectionStatus: 'success',
        },
      });

      expect(OnboardingManager.isComplete()).toBe(true);
    });
  });

  describe('Email Path Validation', () => {
    it('should validate email client path contains email files', () => {
      // This is a mock test - actual file system tests would need temp directories
      const validator = OnboardingManager.validateEmailClientPath;

      expect(typeof validator).toBe('function');
    });
  });

  describe('T027: TODO Method Implementations', () => {
    beforeEach(() => {
      // Reset state before T027 tests
      OnboardingManager.resetState();
    });

    describe('getStatus()', () => {
      it('should return status with correct structure', async () => {
        const status = await OnboardingManager.getStatus();

        expect(status).toHaveProperty('completed');
        expect(status).toHaveProperty('currentStep');
        expect(status).toHaveProperty('totalSteps');
        expect(status.totalSteps).toBe(3);
        expect(typeof status.currentStep).toBe('string');
        expect(status.currentStep).toMatch(/^step-[1-3]$/);
      });
    });

    describe('setStep()', () => {
      it('should set step-1 from step name', async () => {
        const result = await OnboardingManager.setStep('step-1');
        expect(result).toBe(true);
      });

      it('should throw error for invalid step name', async () => {
        await expect(OnboardingManager.setStep('invalid')).rejects.toThrow('Invalid step name');
      });

      it('should throw error for empty string', async () => {
        await expect(OnboardingManager.setStep('')).rejects.toThrow('Invalid step name');
      });

      it('should throw error for step-4', async () => {
        await expect(OnboardingManager.setStep('step-4')).rejects.toThrow('Invalid step name');
      });
    });

    describe('testLLMConnection()', () => {
      it('should test LLM connection and return result', async () => {
        // Mock ConnectionTester
        const { ConnectionTester } = await import('@/llm/ConnectionTester');
        vi.mocked(ConnectionTester).testConnection.mockResolvedValue({
          success: true,
          responseTime: 150,
          model: 'gpt-4',
        });

        const result = await OnboardingManager.testLLMConnection({
          mode: 'remote',
          endpoint: 'https://api.openai.com/v1',
          apiKey: 'test-key',
        });

        expect(result.success).toBe(true);
        expect(result.responseTime).toBe(150);
        expect(result.model).toBe('gpt-4');
      });

      it('should handle connection failure', async () => {
        // Mock ConnectionTester
        const { ConnectionTester } = await import('@/llm/ConnectionTester');
        vi.mocked(ConnectionTester).testConnection.mockResolvedValue({
          success: false,
          error: 'Connection failed',
        });

        const result = await OnboardingManager.testLLMConnection({
          mode: 'remote',
          endpoint: 'https://api.openai.com/v1',
          apiKey: 'invalid-key',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Connection failed');
      });

      it('should call ConnectionTester with correct config', async () => {
        // Mock ConnectionTester
        const { ConnectionTester } = await import('@/llm/ConnectionTester');
        vi.mocked(ConnectionTester).testConnection.mockResolvedValue({
          success: true,
          responseTime: 200,
        });

        await OnboardingManager.testLLMConnection({
          mode: 'local',
          endpoint: 'http://localhost:11434',
          apiKey: '',
        });

        expect(ConnectionTester.testConnection).toHaveBeenCalledWith({
          mode: 'local',
          endpoint: 'http://localhost:11434',
          apiKey: '',
        });
      });
    });
  });
});
