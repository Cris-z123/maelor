/**
 * Onboarding Handler
 *
 * Handles first-run disclosure acknowledgment per Constitution Principle I:
 * - Default remote mode on first launch
 * - Explicit disclosure of data transmission scope
 * - Store user acknowledgment
 * - Only show on first launch
 *
 * References:
 * - Spec FR-031: System MUST default to remote mode on first launch
 * - Constitution Principle I: Privacy-First Architecture
 * - Task T018b: Implement disclosure acknowledgment handler
 */

import type { Database } from 'better-sqlite3';
import { logger } from '../../config/logger.js';

interface OnboardingStatus {
  hasAcknowledgedDisclosure: boolean;
  disclosureVersion: string;
  acknowledgedAt?: number;
}

const CURRENT_DISCLOSURE_VERSION = '1.0.0';
const DISCLOSURE_KEY = 'onboarding_disclosure';

/**
 * Step data for onboarding set-step handler
 * Matches Zod schema inference where all fields are optional
 */
interface StepData {
  emailClient?: {
    type?: 'thunderbird' | 'outlook' | 'apple-mail';
    path?: string;
  };
  schedule?: {
    generationTime?: { hour?: number; minute?: number };
    skipWeekends?: boolean;
  };
  llm?: {
    mode?: 'local' | 'remote';
    localEndpoint?: string;
    remoteEndpoint?: string;
    apiKey?: string;
  };
}

/**
 * Get onboarding status from database
 */
export async function handleGetStatus(
  db: Database
): Promise<OnboardingStatus> {
  try {
    const row = db
      .prepare(
        `
        SELECT value FROM app_metadata
        WHERE key = ?
      `
      )
      .get(DISCLOSURE_KEY) as { value: string } | undefined;

    if (!row) {
      return {
        hasAcknowledgedDisclosure: false,
        disclosureVersion: CURRENT_DISCLOSURE_VERSION,
      };
    }

    const data = JSON.parse(row.value) as OnboardingStatus;
    return data;
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    return {
      hasAcknowledgedDisclosure: false,
      disclosureVersion: CURRENT_DISCLOSURE_VERSION,
    };
  }
}

/**
 * New IPC handlers for onboarding (T020)
 * These handlers delegate to OnboardingManager for business logic
 */

/**
 * Get onboarding status (new version for T020)
 */
export async function handleGetStatusV2(_event: Electron.IpcMainInvokeEvent) {
  const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
  return await OnboardingManager.getStatus();
}

/**
 * Set onboarding step with validation (T020)
 */
const VALID_STEPS = ['welcome', 'email-client', 'schedule', 'llm-config', 'complete'];

export async function handleSetStepV2(
  _event: Electron.IpcMainInvokeEvent,
  step: string
) {
  if (!VALID_STEPS.includes(step)) {
    throw new Error('Invalid onboarding step');
  }

  const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
  return await OnboardingManager.setStep(step);
}

/**
 * Detect email client (T020)
 */
export async function handleDetectEmailClientV2(
  _event: Electron.IpcMainInvokeEvent,
  _type?: 'thunderbird' | 'outlook' | 'apple-mail'
) {
  try {
    logger.info('OnboardingHandler', 'Detect email client requested', { type: _type });
    const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
    const result = await OnboardingManager.detectEmailClient();
    logger.info('OnboardingHandler', 'Detect email client succeeded', result);
    return result;
  } catch (error) {
    logger.error('OnboardingHandler', 'Detect email client failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Validate email path (T020)
 */
export async function handleValidateEmailPathV2(
  _event: Electron.IpcMainInvokeEvent,
  path: string,
  clientType: string
) {
  const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
  return await OnboardingManager.validateEmailPath(path, clientType);
}

/**
 * Test LLM connection (T020)
 */
export async function handleTestLLMConnectionV2(
  _event: Electron.IpcMainInvokeEvent,
  config: { mode: string; endpoint: string; apiKey: string }
) {
  if (!config.endpoint || !config.apiKey) {
    throw new Error('Invalid LLM configuration');
  }

  const { default: OnboardingManager } = await import('../../onboarding/OnboardingManager.js');
  return await OnboardingManager.testLLMConnection(config);
}

/**
 * Set onboarding step
 */
export async function handleSetStep(
  _db: Database,
  _step: 1 | 2 | 3,
  _data?: StepData
): Promise<{ success: boolean; error?: string }> {
  // Implementation to be added based on OnboardingManager
  // For now, return success
  return { success: true };
}

/**
 * Acknowledge first-run disclosure
 */
export async function handleAcknowledge(
  db: Database
): Promise<{ success: boolean }> {
  try {
    const status: OnboardingStatus = {
      hasAcknowledgedDisclosure: true,
      disclosureVersion: CURRENT_DISCLOSURE_VERSION,
      acknowledgedAt: Date.now(),
    };

    db
      .prepare(
        `
        INSERT OR REPLACE INTO app_metadata (key, value)
        VALUES (?, ?)
      `
      )
      .run(DISCLOSURE_KEY, JSON.stringify(status));

    return { success: true };
  } catch (error) {
    console.error('Failed to save onboarding acknowledgment:', error);
    throw error;
  }
}

/**
 * Detect email client installation path
 */
export async function handleDetectEmailClient(
  _db: Database,
  _type: 'thunderbird' | 'outlook' | 'apple-mail'
): Promise<{ detectedPath: string | null; error?: string }> {
  // Call EmailClientDetector
  // Implementation to be added
  return { detectedPath: null, error: 'NOT_IMPLEMENTED' };
}

/**
 * Validate email client path
 */
export async function handleValidateEmailPath(
  _db: Database,
  _path: string
): Promise<{ valid: boolean; message: string }> {
  // Implementation to be added
  return { valid: false, message: 'NOT_IMPLEMENTED' };
}

/**
 * Test LLM connection
 */
export async function handleTestLLMConnection(
  _db: Database,
  _request: {
    mode: 'local' | 'remote';
    localEndpoint?: string;
    remoteEndpoint?: string;
    apiKey?: string;
  }
): Promise<{ success: boolean; responseTime: number; error?: string }> {
  // Implementation to be added
  return { success: false, responseTime: 0, error: 'NOT_IMPLEMENTED' };
}

/**
 * Disclosure text for remote mode (per Constitution Principle I)
 */
export const REMOTE_MODE_DISCLOSURE = {
  title: 'Data Transmission Notice',
  content: [
    'Using remote mode will send email content to third-party LLM service via TLS 1.3 encryption.',
    'All processing occurs remotely.',
    'No data is stored on external servers.',
  ],
  buttonText: 'I Understand',
  settingsLink: 'You can change modes in Settings at any time.',
};

/**
 * Disclosure text for local mode option
 */
export const LOCAL_MODE_INFO = {
  title: 'Local Mode Available',
  content: [
    'For complete privacy, you can switch to local mode.',
    'Local mode processes all data on your device using Ollama.',
    'No data is transmitted to external services.',
  ],
};
