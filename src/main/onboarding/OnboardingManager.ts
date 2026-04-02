import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import type { Database } from 'better-sqlite3';

import DatabaseManager from '../database/Database.js';
import { logger } from '../config/logger.js';

export interface OnboardingState {
  completed: boolean;
  currentStep: 1 | 2 | 3;
  outlookDirectory: string;
  detectedOutlookDirectory: string | null;
  readablePstCount: number;
  ai: {
    baseUrl: string;
    apiKey: string;
    model: string;
    connectionStatus: 'untested' | 'success' | 'failed';
    responseTimeMs: number | null;
  };
  lastUpdated: number;
}

export type OnboardingUpdate = Partial<Omit<OnboardingState, 'lastUpdated'>>;

class OnboardingManager {
  private static readonly CONFIG_KEY = 'onboarding';

  private static get db(): Database {
    return DatabaseManager.getDatabase();
  }

  static getState(): OnboardingState {
    try {
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

      const decrypted = safeStorage.decryptString(row.config_value);
      return this.mergeWithDefaults(JSON.parse(decrypted) as Partial<OnboardingState>);
    } catch (error) {
      logger.error('OnboardingManager', 'Failed to load state', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.getDefaultState();
    }
  }

  static updateState(update: OnboardingUpdate): OnboardingState {
    const current = this.getState();
    const updated = this.mergeWithDefaults({
      ...current,
      ...update,
      ai: {
        ...current.ai,
        ...(update.ai ?? {}),
      },
      lastUpdated: Date.now(),
    });

    this.validateStateTransition(current, updated);

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage not available - cannot encrypt onboarding state');
    }

    const encryptedBytes = safeStorage.encryptString(JSON.stringify(updated));

    this.db
      .prepare(
        'INSERT OR REPLACE INTO user_config (config_key, config_value, updated_at) VALUES (?, ?, ?)'
      )
      .run(this.CONFIG_KEY, encryptedBytes, Math.floor(Date.now() / 1000));

    return updated;
  }

  static isComplete(): boolean {
    return this.getState().completed;
  }

  static getCurrentStep(): 1 | 2 | 3 {
    return this.getState().currentStep;
  }

  static resetState(): void {
    this.db.prepare('DELETE FROM user_config WHERE config_key = ?').run(this.CONFIG_KEY);
    logger.warn('OnboardingManager', 'Reset onboarding state');
  }

  static detectOutlookDirectory(): { detectedPath: string | null; reason: string } {
    const candidates = [
      path.join(app.getPath('documents'), 'Outlook Files'),
      path.join(app.getPath('appData'), 'Microsoft', 'Outlook'),
      path.join(app.getPath('home'), 'AppData', 'Local', 'Microsoft', 'Outlook'),
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          const files = fs.readdirSync(candidate);
          const hasPst = files.some((file) => file.toLowerCase().endsWith('.pst'));
          if (hasPst) {
            return { detectedPath: candidate, reason: 'Detected PST files in a default Outlook directory.' };
          }
        }
      } catch {
        // Ignore inaccessible candidates and continue.
      }
    }

    return {
      detectedPath: null,
      reason: 'No default Outlook PST directory was detected.',
    };
  }

  static recordValidation(directoryPath: string, readablePstCount: number): OnboardingState {
    return this.updateState({
      currentStep: readablePstCount > 0 ? 2 : 1,
      outlookDirectory: directoryPath,
      readablePstCount,
    });
  }

  static async testConnection(config: {
    baseUrl: string;
    apiKey: string;
    model: string;
  }): Promise<{
    success: boolean;
    responseTimeMs: number | null;
    message: string;
  }> {
    const { ConnectionTester } = await import('../llm/ConnectionTester.js');

    const result = await ConnectionTester.testConnection(config);

    this.updateState({
      currentStep: 3,
      ai: {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        connectionStatus: result.success ? 'success' : 'failed',
        responseTimeMs: result.success ? result.responseTimeMs ?? null : null,
      },
    });

    return {
      success: result.success,
      responseTimeMs: result.success ? result.responseTimeMs ?? null : null,
      message: result.success ? 'AI connection succeeded.' : result.error ?? 'AI connection failed.',
    };
  }

  static completeSetup(config: {
    directoryPath: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    readablePstCount: number;
  }): OnboardingState {
    return this.updateState({
      completed: true,
      currentStep: 3,
      outlookDirectory: config.directoryPath,
      detectedOutlookDirectory: config.directoryPath,
      readablePstCount: config.readablePstCount,
      ai: {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        connectionStatus: 'success',
        responseTimeMs: this.getState().ai.responseTimeMs,
      },
    });
  }

  private static getDefaultState(): OnboardingState {
    return {
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
      lastUpdated: Date.now(),
    };
  }

  private static mergeWithDefaults(state: Partial<OnboardingState>): OnboardingState {
    const defaults = this.getDefaultState();
    return {
      ...defaults,
      ...state,
      ai: {
        ...defaults.ai,
        ...(state.ai ?? {}),
      },
      lastUpdated: state.lastUpdated ?? defaults.lastUpdated,
    };
  }

  private static validateStateTransition(current: OnboardingState, updated: OnboardingState): void {
    if (updated.currentStep < current.currentStep) {
      throw new Error(`Cannot move back from step ${current.currentStep} to ${updated.currentStep}`);
    }

    if (updated.currentStep >= 2 && !updated.outlookDirectory.trim()) {
      throw new Error('Outlook directory is required before PST validation.');
    }

    if (updated.currentStep >= 3 && updated.readablePstCount < 1) {
      throw new Error('At least one readable PST is required before AI configuration.');
    }

    if (updated.completed) {
      if (updated.readablePstCount < 1) {
        throw new Error('At least one readable PST is required before completion.');
      }
      if (updated.ai.connectionStatus !== 'success') {
        throw new Error('AI connection must succeed before completion.');
      }
    }
  }
}

export default OnboardingManager;
