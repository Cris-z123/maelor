import type {
  MvpConnectionResult,
  MvpOnboardingStatus,
  MvpRunDetail,
  MvpRunSummary,
  MvpSettingsView,
  MvpValidationResult,
} from '@shared/types/mvp';

const fallbackSettings: MvpSettingsView = {
  outlookDirectory: '',
  aiBaseUrl: '',
  aiModel: '',
  databasePath: '',
  databaseSizeBytes: 0,
};

const apiUnavailableMessage = 'Electron API 不可用。';

function getApi() {
  return window.electronAPI;
}

export const mvpApi = {
  async getOnboardingStatus(): Promise<MvpOnboardingStatus> {
    const api = getApi();
    if (!api) {
      return {
        completed: false,
        currentStep: 1,
        readablePstCount: 0,
        outlookDirectory: null,
      };
    }

    return api.onboarding.getStatus();
  },

  async detectOutlookDirectory(): Promise<string | null> {
    const api = getApi();
    if (!api) return null;

    const result = await api.onboarding.detectEmailClient({ type: 'outlook' });
    const match = result.clients.find((client) => client.type === 'outlook');
    return match?.path ?? null;
  },

  async validateOutlookDirectory(directoryPath: string): Promise<MvpValidationResult> {
    const api = getApi();
    if (!api) {
      return {
        valid: false,
        readablePstCount: 0,
        unreadablePstCount: 0,
        files: [],
        message: apiUnavailableMessage,
      };
    }

    return api.onboarding.validateEmailPath({ path: directoryPath, clientType: 'outlook' });
  },

  async testConnection(baseUrl: string, apiKey: string): Promise<MvpConnectionResult> {
    const api = getApi();
    if (!api) {
      return {
        success: false,
        responseTimeMs: null,
        message: apiUnavailableMessage,
      };
    }

    return api.onboarding.testLLMConnection({
      mode: 'remote',
      remoteEndpoint: baseUrl,
      apiKey,
    });
  },

  async completeSetup(request: {
    directoryPath: string;
    baseUrl: string;
    apiKey: string;
    model: string;
  }): Promise<{ success: boolean; error?: string }> {
    const api = getApi();
    if (!api) return { success: false, error: apiUnavailableMessage };
    return api.onboarding.completeSetup(request);
  },

  async startRun(): Promise<{ success: boolean; runId: string | null; message: string }> {
    const api = getApi();
    if (!api) {
      return { success: false, runId: null, message: apiUnavailableMessage };
    }

    return api.runs.start();
  },

  async getLatestRun(): Promise<MvpRunDetail | null> {
    const api = getApi();
    if (!api) return null;
    return api.runs.getLatest();
  },

  async getRunById(runId: string): Promise<MvpRunDetail | null> {
    const api = getApi();
    if (!api) return null;
    return api.runs.getById({ runId });
  },

  async listRecentRuns(): Promise<MvpRunSummary[]> {
    const api = getApi();
    if (!api) return [];
    return api.runs.listRecent({ limit: 20 });
  },

  async getSettingsSummary(): Promise<MvpSettingsView> {
    const api = getApi();
    if (!api) return fallbackSettings;
    return api.settings.getDataSummary();
  },

  async updateSettings(updates: Partial<MvpSettingsView> & { apiKey?: string }): Promise<boolean> {
    const api = getApi();
    if (!api) return false;

    const result = await api.settings.update({
      section: 'data',
      updates,
    });

    return result.success;
  },

  async clearRuns(): Promise<{ success: boolean; deletedRunCount: number }> {
    const api = getApi();
    if (!api) return { success: false, deletedRunCount: 0 };
    return api.settings.clearRuns();
  },

  async rebuildIndex(): Promise<{ success: boolean; message: string }> {
    const api = getApi();
    if (!api) return { success: false, message: apiUnavailableMessage };
    return api.settings.rebuildIndex();
  },
};

export default mvpApi;
