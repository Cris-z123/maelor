/**
 * OnboardingManager
 *
 * Manages first-time setup wizard state and configuration persistence.
 * Tracks completion through 3 steps: email client, schedule, LLM config.
 *
 * Per plan.md T011, data-model.md section 1
 */

import DatabaseManager from '../database/Database.js';
import { logger } from '../config/logger.js';
import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import type { Database } from 'better-sqlite3';

/**
 * Onboarding state structure
 */
export interface OnboardingState {
  // Completion status
  completed: boolean;
  currentStep: 1 | 2 | 3;

  // Step 1: Email client configuration
  emailClient: {
    type: 'thunderbird' | 'outlook' | 'apple-mail';
    path: string;
    detectedPath: string | null;
    validated: boolean;
  };

  // Step 2: Schedule settings
  schedule: {
    generationTime: {
      hour: number; // 0-23
      minute: number; // 0-59
    };
    skipWeekends: boolean;
  };

  // Step 3: LLM configuration
  llm: {
    mode: 'local' | 'remote';
    localEndpoint: string;
    remoteEndpoint: string;
    apiKey: string; // Encrypted
    connectionStatus: 'untested' | 'success' | 'failed';
    responseTime?: number; // Response time in ms
  };

  // Metadata
  lastUpdated: number; // Unix timestamp
}

/**
 * Onboarding state update options
 */
export type OnboardingUpdate = Partial<Omit<OnboardingState, 'lastUpdated'>>;

/**
 * Onboarding Manager
 *
 * Features:
 * - Track wizard completion state (steps 1/2/3)
 * - Persist configuration to user_config table
 * - Validate step transitions
 * - Support resume from last completed step
 * - Encrypt sensitive data (API keys)
 */
class OnboardingManager {
  private static readonly CONFIG_KEY = 'onboarding';

  private static get db(): Database {
    return DatabaseManager.getDatabase();
  }

  /**
   * Get current onboarding state
   * Returns default state if not found or safeStorage unavailable
   */
  static getState(): OnboardingState {
    try {
      // Check if safeStorage is available
      if (!safeStorage.isEncryptionAvailable()) {
        logger.warn('OnboardingManager', 'safeStorage not available, using default state');
        return this.getDefaultState();
      }

      const row = this.db
        .prepare('SELECT config_value FROM user_config WHERE config_key = ?')
        .get(this.CONFIG_KEY) as { config_value: Buffer } | undefined;

      if (!row) {
        return this.getDefaultState();
      }

      // Decrypt config value
      const decryptedBytes = safeStorage.decryptString(row.config_value);
      const state = JSON.parse(decryptedBytes) as OnboardingState;

      logger.info('OnboardingManager', 'Loaded onboarding state', {
        completed: state.completed,
        currentStep: state.currentStep,
      });

      return state;
    } catch (error) {
      logger.error('OnboardingManager', 'Failed to load state', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.getDefaultState();
    }
  }

  /**
   * Update onboarding state
   * Validates step transitions and persists to database
   */
  static updateState(update: OnboardingUpdate): OnboardingState {
    const current = this.getState();
    const updated = { ...current, ...update, lastUpdated: Date.now() };

    // Validate step transitions
    if (updated.currentStep < current.currentStep) {
      throw new Error(
        `Cannot move back from step ${current.currentStep} to ${updated.currentStep}`
      );
    }

    // Step 2 requires step 1 email client validation
    if (updated.currentStep >= 2 && !updated.emailClient.validated) {
      throw new Error('Email client must be validated before proceeding to step 2');
    }

    // Step 3 requires step 2 schedule configuration
    if (updated.currentStep >= 3) {
      if (
        updated.schedule.generationTime.hour < 0 ||
        updated.schedule.generationTime.hour > 23
      ) {
        throw new Error('Invalid hour (must be 0-23)');
      }
      if (
        updated.schedule.generationTime.minute < 0 ||
        updated.schedule.generationTime.minute > 59
      ) {
        throw new Error('Invalid minute (must be 0-59)');
      }
    }

    // Completion requires LLM connection test success
    if (updated.completed && updated.llm.connectionStatus !== 'success') {
      throw new Error('LLM connection must succeed before completion');
    }

    // Check if safeStorage is available before encrypting
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage not available - cannot encrypt onboarding state');
    }

    // Encrypt and persist
    const jsonState = JSON.stringify(updated);
    const encryptedBytes = safeStorage.encryptString(jsonState);

    this.db
      .prepare(
        'INSERT OR REPLACE INTO user_config (config_key, config_value, updated_at) VALUES (?, ?, ?)'
      )
      .run(this.CONFIG_KEY, encryptedBytes, Math.floor(Date.now() / 1000));

    logger.info('OnboardingManager', 'Updated onboarding state', {
      completed: updated.completed,
      currentStep: updated.currentStep,
    });

    return updated;
  }

  /**
   * Check if onboarding is complete
   */
  static isComplete(): boolean {
    return this.getState().completed;
  }

  /**
   * Get current step
   */
  static getCurrentStep(): 1 | 2 | 3 {
    return this.getState().currentStep;
  }

  /**
   * Reset onboarding state (for testing/re-onboarding)
   * WARNING: This will delete all onboarding configuration
   */
  static resetState(): void {
    this.db
      .prepare('DELETE FROM user_config WHERE config_key = ?')
      .run(this.CONFIG_KEY);

    logger.warn('OnboardingManager', 'Reset onboarding state');
  }

  /**
   * Get default onboarding state
   */
  private static getDefaultState(): OnboardingState {
    return {
      completed: false,
      currentStep: 1,
      emailClient: {
        type: 'thunderbird',
        path: '',
        detectedPath: null,
        validated: false,
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
        connectionStatus: 'untested',
      },
      lastUpdated: Date.now(),
    };
  }

  /**
   * Validate email client path
   * Checks if path exists and contains email files
   */
  static validateEmailClientPath(userPath: string): boolean {
    try {
      // Check if path exists
      if (!fs.existsSync(userPath)) {
        return false;
      }

      // Check if directory
      const stat = fs.statSync(userPath);
      if (!stat.isDirectory()) {
        return false;
      }

      // Check for email files based on client type
      const hasEmailFiles = fs.readdirSync(userPath).some((file: string) => {
        const ext = path.extname(file).toLowerCase();
        return ['.msf', '.mbx', '.mbox', '.eml'].includes(ext);
      });

      return hasEmailFiles;
    } catch (error) {
      logger.error('OnboardingManager', 'Path validation failed', {
        path: userPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Update LLM connection test result
   */
  static updateLLMConnectionStatus(
    status: 'success' | 'failed',
    responseTime?: number
  ): OnboardingState {
    return this.updateState({
      llm: {
        ...this.getState().llm,
        connectionStatus: status,
        responseTime,
      },
    });
  }

  /**
   * Complete onboarding
   * Called after step 3 LLM connection succeeds
   */
  static completeOnboarding(): OnboardingState {
    return this.updateState({
      completed: true,
      currentStep: 3,
    });
  }

  /**
   * Get onboarding status for IPC (T020)
   */
  static async getStatus() {
    const state = this.getState();
    return {
      completed: state.completed,
      currentStep: `step-${state.currentStep}`, // Map 1/2/3 to step-1/step-2/step-3
      totalSteps: 3,
    };
  }

  /**
   * Set onboarding step (T020)
   */
  static async setStep(stepName: string): Promise<boolean> {
    const stepMap: Record<string, 1 | 2 | 3> = {
      'step-1': 1,
      'step-2': 2,
      'step-3': 3,
    };

    const stepNum = stepMap[stepName];
    if (!stepNum) {
      throw new Error(`Invalid step name: ${stepName}`);
    }

    this.updateState({ currentStep: stepNum });
    return true;
  }

  /**
   * Detect email client (T020)
   */
  static async detectEmailClient() {
    const { EmailClientDetector } = await import('./EmailClientDetector.js');

    // Use platformDefaults for auto-detection
    const defaults = EmailClientDetector.platformDefaults();
    const clients = [];

    for (const [type, clientPath] of Object.entries(defaults)) {
      if (clientPath) {
        clients.push({
          type,
          path: clientPath,
          confidence: 'high'
        });
      }
    }

    return {
      clients,
      platform: process.platform
    };
  }

  /**
   * Validate email path (T020)
   */
  static async validateEmailPath(userPath: string, _clientType: string) {
    const { EmailClientDetector } = await import('./EmailClientDetector.js');
    return await EmailClientDetector.validatePathAsync(userPath);
  }

  /**
   * Test LLM connection (T020)
   */
  static async testLLMConnection(config: {
    mode: string;
    endpoint: string;
    apiKey: string;
  }) {
    const { ConnectionTester } = await import('../llm/ConnectionTester.js');

    const result = await ConnectionTester.testConnection({
      mode: config.mode as 'local' | 'remote',
      endpoint: config.endpoint,
      apiKey: config.apiKey,
    });

    // Update connection status in state
    if (result.success) {
      this.updateLLMConnectionStatus('success', result.responseTime);
    } else {
      this.updateLLMConnectionStatus('failed');
    }

    return result;
  }

  static async completeSetup(config: {
    directoryPath: string;
    baseUrl: string;
    apiKey: string;
    model: string;
  }): Promise<OnboardingState> {
    return this.updateState({
      completed: true,
      currentStep: 3,
      emailClient: {
        type: 'outlook',
        path: config.directoryPath,
        detectedPath: config.directoryPath,
        validated: true,
      },
      llm: {
        ...this.getState().llm,
        mode: 'remote',
        remoteEndpoint: config.baseUrl,
        apiKey: config.apiKey,
        connectionStatus: 'success',
      },
    });
  }
}

export default OnboardingManager;
