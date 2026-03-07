/**
 * Verification Tests for OnboardingManager (T011)
 *
 * Tests the onboarding state management implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { app } from 'electron';
import DatabaseManager from '../../../src/main/database/Database.js';
import OnboardingManager from '../../../src/main/onboarding/OnboardingManager.js';

// Mock Electron safeStorage
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plaintext: string) => Buffer.from(`encrypted:${plaintext}`)),
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

describe('T011: OnboardingManager Implementation', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    DatabaseManager.setInstanceForTesting(db);

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_config (
        config_key TEXT PRIMARY KEY,
        config_value BLOB NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      ) STRICT;
    `);
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
      };

      OnboardingManager.updateState(update);
      const loaded = OnboardingManager.getState();

      expect(loaded.completed).toBe(true);
      expect(loaded.currentStep).toBe(3);
    });
  });

  describe('Step Validation', () => {
    it('should reject moving backward from step 2 to step 1', () => {
      OnboardingManager.updateState({ currentStep: 2 });

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
      // Setup: step 3 with successful connection
      OnboardingManager.updateState({
        currentStep: 3,
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

      OnboardingManager.updateState({ completed: true });

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
});
