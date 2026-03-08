/**
 * Onboarding Store
 *
 * Zustand store for onboarding wizard state management.
 * No persistence - clean state on each launch (per user requirement).
 *
 * Per design doc Section 2.1, T022
 */

import { create } from 'zustand';
import { ipcClient } from '@renderer/services/ipc';

/**
 * Email client configuration
 */
interface EmailClientConfig {
  type: 'thunderbird' | 'outlook' | 'apple-mail';
  path: string;
  detectedPath: string | null;
  isValid: boolean;
  isDetecting: boolean;
}

/**
 * Schedule configuration
 */
interface ScheduleConfig {
  hour: number;
  minute: number;
  skipWeekends: boolean;
}

/**
 * LLM configuration
 */
interface LLMConfig {
  mode: 'local' | 'remote';
  localEndpoint: string;
  remoteEndpoint: string;
  apiKey: string;
  isTesting: boolean;
  connectionStatus: 'idle' | 'testing' | 'success' | 'failed';
  responseTime?: number;
}

/**
 * Onboarding store state
 */
interface OnboardingStore {
  // Current wizard state
  currentStep: 1 | 2 | 3;
  isComplete: boolean;

  // Step 1: Email client config
  emailClient: EmailClientConfig;

  // Step 2: Schedule config
  schedule: ScheduleConfig;

  // Step 3: LLM config
  llm: LLMConfig;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentStep: (step: 1 | 2 | 3) => void;
  setEmailClientType: (type: 'thunderbird' | 'outlook' | 'apple-mail') => void;
  setEmailClientPath: (path: string) => void;
  detectEmailClient: () => Promise<void>;
  validateEmailPath: (path: string) => Promise<boolean>;
  setScheduleTime: (hour: number, minute: number) => void;
  setSkipWeekends: (skip: boolean) => void;
  setLLMMode: (mode: 'local' | 'remote') => void;
  setLLMEndpoint: (endpoint: string) => void;
  setAPIKey: (key: string) => void;
  testLLMConnection: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  reset: () => void;
}

/**
 * Default state
 */
const defaultState: Omit<OnboardingStore, 'actions'> = {
  currentStep: 1,
  isComplete: false,
  emailClient: {
    type: 'thunderbird',
    path: '',
    detectedPath: null,
    isValid: false,
    isDetecting: false,
  },
  schedule: {
    hour: 18,
    minute: 0,
    skipWeekends: true,
  },
  llm: {
    mode: 'remote',
    localEndpoint: 'http://localhost:11434',
    remoteEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    isTesting: false,
    connectionStatus: 'idle',
  },
  isLoading: false,
  error: null,
};

/**
 * Create onboarding store
 */
export const onboardingStore = create<OnboardingStore>((set, get) => ({
  ...defaultState,

  setCurrentStep: (step) => set({ currentStep: step }),

  setEmailClientType: (type) =>
    set((state) => ({
      emailClient: { ...state.emailClient, type },
    })),

  setEmailClientPath: (path) =>
    set((state) => ({
      emailClient: { ...state.emailClient, path },
    })),

  detectEmailClient: async () => {
    set((state) => ({
      emailClient: { ...state.emailClient, isDetecting: true },
      error: null,
    }));

    try {
      const result = await ipcClient.detectEmailClient(get().emailClient.type);

      if (result.detectedPath) {
        set((state) => ({
          emailClient: {
            ...state.emailClient,
            detectedPath: result.detectedPath,
            isDetecting: false,
          },
        }));
      } else {
        set((state) => ({
          emailClient: {
            ...state.emailClient,
            isDetecting: false,
          },
          error: result.error || 'No email client detected',
        }));
      }
    } catch (error) {
      set((state) => ({
        emailClient: { ...state.emailClient, isDetecting: false },
        error: error instanceof Error ? error.message : 'Detection failed',
      }));
    }
  },

  validateEmailPath: async (path) => {
    try {
      const result = await ipcClient.validateEmailPath(path);

      if (result.valid) {
        set((state) => ({
          emailClient: {
            ...state.emailClient,
            path,
            isValid: true,
          },
          error: null,
        }));
        return true;
      } else {
        set((state) => ({
          emailClient: { ...state.emailClient, isValid: false },
          error: result.message || 'Invalid path',
        }));
        return false;
      }
    } catch (error) {
      set((state) => ({
        emailClient: { ...state.emailClient, isValid: false },
        error: error instanceof Error ? error.message : 'Validation failed',
      }));
      return false;
    }
  },

  setScheduleTime: (hour, minute) =>
    set((state) => ({
      schedule: { ...state.schedule, hour, minute },
    })),

  setSkipWeekends: (skipWeekends) =>
    set((state) => ({
      schedule: { ...state.schedule, skipWeekends },
    })),

  setLLMMode: (mode) =>
    set((state) => ({
      llm: {
        ...state.llm,
        mode,
        connectionStatus: 'idle',
      },
    })),

  setLLMEndpoint: (endpoint) =>
    set((state) => ({
      llm: {
        ...state.llm,
        [state.llm.mode === 'local' ? 'localEndpoint' : 'remoteEndpoint']: endpoint,
      },
    })),

  setAPIKey: (apiKey) =>
    set((state) => ({
      llm: { ...state.llm, apiKey },
    })),

  testLLMConnection: async () => {
    const state = get();

    set((state) => ({
      llm: { ...state.llm, isTesting: true, connectionStatus: 'testing' },
      error: null,
    }));

    try {
      const result = await ipcClient.testLLMConnection({
        mode: state.llm.mode,
        localEndpoint: state.llm.localEndpoint,
        remoteEndpoint: state.llm.remoteEndpoint,
        apiKey: state.llm.apiKey,
      });

      if (result.success) {
        set((state) => ({
          llm: {
            ...state.llm,
            isTesting: false,
            connectionStatus: 'success',
            responseTime: result.responseTime,
          },
        }));
      } else {
        set((state) => ({
          llm: {
            ...state.llm,
            isTesting: false,
            connectionStatus: 'failed',
          },
          error: result.error || 'Connection test failed',
        }));
      }
    } catch (error) {
      set((state) => ({
        llm: {
          ...state.llm,
          isTesting: false,
          connectionStatus: 'failed',
        },
        error: error instanceof Error ? error.message : 'Connection test failed',
      }));
    }
  },

  completeOnboarding: async () => {
    set({ isLoading: true, error: null });

    try {
      await ipcClient.setOnboardingStep(3, {
        emailClient: {
          type: get().emailClient.type,
          path: get().emailClient.path,
        },
        schedule: {
          generationTime: {
            hour: get().schedule.hour,
            minute: get().schedule.minute,
          },
          skipWeekends: get().schedule.skipWeekends,
        },
        llm: {
          mode: get().llm.mode,
          localEndpoint: get().llm.localEndpoint,
          remoteEndpoint: get().llm.remoteEndpoint,
          apiKey: get().llm.apiKey,
        },
      });

      set({ isLoading: false, isComplete: true });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
      });
    }
  },

  reset: () => set(defaultState as OnboardingStore),
}));
