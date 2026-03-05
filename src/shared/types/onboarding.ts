/**
 * Onboarding state types
 * Per data-model.md section 1
 */

export interface EmailClientConfig {
  type: 'thunderbird' | 'outlook' | 'apple-mail';
  path: string;
  detectedPath: string | null;
  validated: boolean;
}

export interface ScheduleConfig {
  generationTime: {
    hour: number; // 0-23
    minute: number; // 0-59
  };
  skipWeekends: boolean;
}

export interface LLMConfig {
  mode: 'local' | 'remote';
  localEndpoint: string;
  remoteEndpoint: string;
  apiKey: string;
  connectionStatus: 'untested' | 'success' | 'failed';
}

export interface OnboardingState {
  completed: boolean;
  currentStep: 1 | 2 | 3;
  emailClient: EmailClientConfig;
  schedule: ScheduleConfig;
  llm: LLMConfig;
  lastUpdated: number;
}
