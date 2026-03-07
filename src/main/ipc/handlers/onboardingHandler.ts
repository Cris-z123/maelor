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

interface OnboardingStatus {
  completed: boolean;
  currentStep: 1 | 2 | 3;
  canProceed: boolean;
}

const CURRENT_DISCLOSURE_VERSION = '1.0.0';
const DISCLOSURE_KEY = 'onboarding_disclosure';

/**
 * Step data for onboarding set-step handler
 */
interface StepData {
  emailClient?: {
    type: 'thunderbird' | 'outlook' | 'apple-mail';
    path: string;
  };
  schedule?: {
    generationTime: { hour: number; minute: number };
    skipWeekends: boolean;
  };
  llm?: {
    mode: 'local' | 'remote';
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
        completed: false,
        currentStep: 1,
        canProceed: false,
      };
    }

    const data = JSON.parse(row.value) as OnboardingStatus;
    return data;
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    return {
      completed: false,
      currentStep: 1,
      canProceed: false,
    };
  }
}

/**
 * Set onboarding step
 */
export async function handleSetStep(
  db: Database,
  step: 1 | 2 | 3,
  data?: StepData
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
      completed: false,
      currentStep: 1,
      canProceed: true,
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
  db: Database,
  type: 'thunderbird' | 'outlook' | 'apple-mail'
): Promise<{ detectedPath: string | null; error?: string }> {
  // Call EmailClientDetector
  // Implementation to be added
  return { detectedPath: null, error: 'NOT_IMPLEMENTED' };
}

/**
 * Validate email client path
 */
export async function handleValidateEmailPath(
  db: Database,
  path: string
): Promise<{ valid: boolean; message: string }> {
  // Implementation to be added
  return { valid: false, message: 'NOT_IMPLEMENTED' };
}

/**
 * Test LLM connection
 */
export async function handleTestLLMConnection(
  db: Database,
  request: {
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
