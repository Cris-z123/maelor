/**
 * IPC Client Service
 *
 * Service layer for IPC communication between renderer and main process.
 * Provides type-safe wrappers for all IPC channels.
 *
 * Per Constitution Principle V: Only whitelisted channels are used.
 */

import type {
  ElectronAPI,
  Item,
  TodoItemWithSources,
} from '@shared/types';

/**
 * IPC Client class
 *
 * Provides type-safe methods to communicate with main process via ElectronAPI
 */
class IPCClient {
  private api: ElectronAPI;

  constructor(api?: ElectronAPI) {
    // Access ElectronAPI exposed by preload script, or use provided api (for testing)
    this.api = api || window.electronAPI || this.createMockAPI();
  }

  /**
   * Create mock API for development/testing (when running without Electron)
   */
  private createMockAPI(): ElectronAPI {
    console.warn('[IPC] ElectronAPI not found, using mock API');
    return {
      llm: {
        generate: async () => ({
          success: false,
          items: [],
          processed_emails: [],
          skipped_emails: 0,
          reprocessed_emails: 0,
        }),
      },
      db: {
        queryHistory: async () => [],
        export: async () => ({
          success: false,
          filePath: '',
          format: 'markdown',
          itemCount: 0,
        }),
      },
      config: {
        get: async () => ({}),
        set: async () => ({ success: true, updated: [] }),
      },
      app: {
        checkUpdate: async () => ({ hasUpdate: false }),
      },
      email: {
        fetchMeta: async () => ({
          success: false,
          error: 'Mock API: Not running in Electron',
        }),
      },
      onboarding: {
        getStatus: async () => ({
          completed: false,
          currentStep: 'step-1',
          totalSteps: 3
        }),
        setStep: async () => true,
        detectEmailClient: async () => ({
          clients: [],
          platform: process.platform || 'unknown'
        }),
        validateEmailPath: async () => ({
          valid: false,
          error: 'Mock: Not running in Electron'
        }),
        testLLMConnection: async () => ({
          success: false,
          error: 'Mock: Not running in Electron'
        })
      }
    };
  }

  // =============================================================================
  // LLM Operations
  // =============================================================================

  /**
   * Generate action items from email batch
   * Channel: llm:generate
   */
  async generateItems(request: {
    emails: Array<{ filePath: string; format: string }>;
    mode: 'local' | 'remote';
    reportDate: string;
  }): Promise<{
    success: boolean;
    items: Item[];
    processed_emails: Array<{
      email_hash: string;
      search_string: string;
      file_path: string;
      extract_status: string;
    }>;
    skipped_emails: number;
    reprocessed_emails: number;
  }> {
    try {
      const response = await this.api.llm.generate(request);
      return response;
    } catch (error) {
      console.error('[IPC] LLM generate failed:', error);
      throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Database Operations
  // =============================================================================

  /**
   * Query database for reports or items
   * Channel: db:query:history
   */
  async queryHistory(request: {
    query: string;
    params?: Record<string, unknown>;
  }): Promise<TodoItemWithSources[]> {
    try {
      const items = await this.api.db.queryHistory(request);
      return items;
    } catch (error) {
      console.error('[IPC] DB query failed:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export database to file
   * Channel: db:export
   */
  async exportData(request: {
    format: 'markdown' | 'pdf';
    reportDate?: string;
    startDate?: string;
    endDate?: string;
    includeAll?: boolean;
  }): Promise<{
    success: boolean;
    filePath: string;
    format: string;
    itemCount: number;
  }> {
    try {
      const response = await this.api.db.export(request);
      return response;
    } catch (error) {
      console.error('[IPC] DB export failed:', error);
      throw new Error(`Database export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Configuration Operations
  // =============================================================================

  /**
   * Get configuration values
   * Channel: config:get
   */
  async getConfig(keys?: string[]): Promise<Record<string, unknown>> {
    try {
      const config = await this.api.config.get(keys);
      return config;
    } catch (error) {
      console.error('[IPC] Config get failed:', error);
      throw new Error(`Config get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set configuration values
   * Channel: config:set
   */
  async setConfig(updates: Record<string, unknown>): Promise<{
    success: boolean;
    updated: string[];
  }> {
    try {
      const response = await this.api.config.set(updates);
      return response;
    } catch (error) {
      console.error('[IPC] Config set failed:', error);
      throw new Error(`Config set failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Application Operations
  // =============================================================================

  /**
   * Check for application updates
   * Channel: app:check-update
   */
  async checkUpdate(mode: 'auto' | 'manual'): Promise<{
    hasUpdate: boolean;
    version?: string;
    releaseNotes?: string;
    downloadUrl?: string;
  }> {
    try {
      const updateInfo = await this.api.app.checkUpdate(mode);
      return updateInfo;
    } catch (error) {
      console.error('[IPC] Update check failed:', error);
      throw new Error(`Update check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Email Operations
  // =============================================================================

  /**
   * Fetch email metadata without processing
   * Channel: email:fetch-meta
   */
  async fetchEmailMeta(filePath: string, format: string): Promise<{
    success: boolean;
    metadata?: {
      from?: string;
      subject?: string;
      date?: string;
      attachmentCount?: number;
      size?: number;
      format?: string;
    };
    error?: string;
  }> {
    try {
      const response = await this.api.email.fetchMeta(filePath, format);
      return response;
    } catch (error) {
      console.error('[IPC] Email metadata fetch failed:', error);
      throw new Error(`Email metadata fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Onboarding Operations
  // =============================================================================

  /**
   * Get onboarding wizard status
   * Channel: onboarding:get-status
   */
  async getOnboardingStatus(): Promise<{
    completed: boolean;
    currentStep: 1 | 2 | 3;
    canProceed: boolean;
  }> {
    try {
      const response = await this.api.onboarding.getStatus();
      return response;
    } catch (error) {
      console.error('[IPC] Onboarding get-status failed:', error);
      throw new Error(`Onboarding get-status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update onboarding wizard step progress
   * Channel: onboarding:set-step
   */
  async setOnboardingStep(
    step: 1 | 2 | 3,
    data?: {
      emailClient?: { type: 'thunderbird' | 'outlook' | 'apple-mail'; path: string };
      schedule?: { generationTime: { hour: number; minute: number }; skipWeekends: boolean };
      llm?: {
        mode: 'local' | 'remote';
        localEndpoint?: string;
        remoteEndpoint?: string;
        apiKey?: string;
      };
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.onboarding.setStep({ step, data });
      return response;
    } catch (error) {
      console.error('[IPC] Onboarding set-step failed:', error);
      throw new Error(`Onboarding set-step failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auto-detect email client installation path
   * Channel: onboarding:detect-email-client
   */
  async detectEmailClient(type: 'thunderbird' | 'outlook' | 'apple-mail'): Promise<{
    clients: Array<{ type: string; path: string; confidence: string }>;
    platform: string;
  }> {
    try {
      const response = await this.api.onboarding.detectEmailClient(type);
      return response;
    } catch (error) {
      console.error('[IPC] Onboarding detect-email-client failed:', error);
      throw new Error(`Onboarding detect-email-client failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate email client path contains email files
   * Channel: onboarding:validate-email-path
   */
  async validateEmailPath(path: string): Promise<{
    valid: boolean;
    message: string;
  }> {
    try {
      const response = await this.api.onboarding.validateEmailPath({ path });
      return response;
    } catch (error) {
      console.error('[IPC] Onboarding validate-email-path failed:', error);
      throw new Error(`Onboarding validate-email-path failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test LLM API connectivity
   * Channel: onboarding:test-llm-connection
   */
  async testLLMConnection(config: {
    mode: 'local' | 'remote';
    localEndpoint?: string;
    remoteEndpoint?: string;
    apiKey?: string;
  }): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    try {
      const response = await this.api.onboarding.testLLMConnection(config);
      return response;
    } catch (error) {
      console.error('[IPC] Onboarding test-llm-connection failed:', error);
      throw new Error(`Onboarding test-llm-connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Generation Operations
  // =============================================================================

  /**
   * Start manual report generation
   * Channel: generation:start
   */
  async startGeneration(): Promise<{
    success: boolean;
    emailCount?: number;
    error?: string;
  }> {
    try {
      const response = await this.api.generation.start();
      return response;
    } catch (error) {
      console.error('[IPC] Generation start failed:', error);
      throw new Error(`Generation start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel in-progress report generation
   * Channel: generation:cancel
   */
  async cancelGeneration(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await this.api.generation.cancel();
      return response;
    } catch (error) {
      console.error('[IPC] Generation cancel failed:', error);
      throw new Error(`Generation cancel failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Listen for generation progress events
   * Channel: generation:progress (event)
   * @returns Unsubscribe function
   */
  onProgress(callback: (data: {
    stage: 'processing' | 'complete' | 'error';
    current: number;
    total: number;
    percentage: number;
    subject: string;
  }) => void): () => void {
    // Register with ElectronAPI
    if (this.api.generation?.onProgress) {
      this.api.generation.onProgress(callback);
    }

    // Return unsubscribe function
    return () => {
      // Cleanup logic here
    };
  }

  // =============================================================================
  // Reports Operations
  // =============================================================================

  /**
   * Get today's daily report
   * Channel: reports:get-today
   */
  async getTodayReport(): Promise<{
    date: string;
    summary: {
      totalEmails: number;
      completedItems: number;
      pendingItems: number;
      reviewCount: number;
    };
    items: any[];
  }> {
    try {
      const response = await this.api.reports.getToday();
      return response;
    } catch (error) {
      console.error('[IPC] Reports get-today failed:', error);
      throw new Error(`Reports get-today failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get report for specific date
   * Channel: reports:get-by-date
   */
  async getReportByDate(date: string): Promise<any> {
    try {
      const response = await this.api.reports.getByDate({ date });
      return response;
    } catch (error) {
      console.error('[IPC] Reports get-by-date failed:', error);
      throw new Error(`Reports get-by-date failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search historical reports
   * Channel: reports:search
   */
  async searchReports(request: {
    keywords: string;
    dateRange: {
      type: 'all' | 'today' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'custom';
      startDate?: string;
      endDate?: string;
    };
    filters: {
      itemTypes?: ('completed' | 'pending')[];
      confidenceLevels?: ('high' | 'medium' | 'low')[];
      hasFeedback?: boolean;
    };
    pagination: {
      page: number;
      perPage: number;
    };
  }): Promise<{
    items: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    matchHighlights: Record<string, string[]>;
  }> {
    try {
      const response = await this.api.reports.search(request);
      return response;
    } catch (error) {
      console.error('[IPC] Reports search failed:', error);
      throw new Error(`Reports search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get item details with source emails
   * Channel: reports:expand-item
   */
  async expandItem(itemId: string): Promise<any> {
    try {
      const response = await this.api.reports.expandItem({ itemId });
      return response;
    } catch (error) {
      console.error('[IPC] Reports expand-item failed:', error);
      throw new Error(`Reports expand-item failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit accuracy feedback
   * Channel: reports:submit-feedback
   */
  async submitFeedback(request: {
    itemId: string;
    type: 'accurate' | 'content_error' | 'priority_error' | 'not_actionable' | 'source_error';
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.api.reports.submitFeedback(request);
      return response;
    } catch (error) {
      console.error('[IPC] Reports submit-feedback failed:', error);
      throw new Error(`Reports submit-feedback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Copy search keywords to clipboard
   * Channel: reports:copy-search-term
   */
  async copySearchTerm(itemId: string): Promise<{ success: boolean; searchTerm: string }> {
    try {
      const response = await this.api.reports.copySearchTerm({ itemId });
      return response;
    } catch (error) {
      console.error('[IPC] Reports copy-search-term failed:', error);
      throw new Error(`Reports copy-search-term failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Settings Operations
  // =============================================================================

  /**
   * Get all settings
   * Channel: settings:get-all
   */
  async getAllSettings(): Promise<any> {
    try {
      const response = await this.api.settings.getAll();
      return response;
    } catch (error) {
      console.error('[IPC] Settings get-all failed:', error);
      throw new Error(`Settings get-all failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update settings section
   * Channel: settings:update
   */
  async updateSettings(
    section: 'email' | 'schedule' | 'llm' | 'display' | 'notifications' | 'data',
    updates: Partial<any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.settings.update({ section, updates });
      return response;
    } catch (error) {
      console.error('[IPC] Settings update failed:', error);
      throw new Error(`Settings update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean old data
   * Channel: settings:cleanup-data
   */
  async cleanupData(dateRange: string): Promise<{
    cutoffDate: string;
    reportCount: number;
    itemCount: number;
    sizeToFree: number;
  }> {
    try {
      const response = await this.api.settings.cleanupData({ dateRange });
      return response;
    } catch (error) {
      console.error('[IPC] Settings cleanup-data failed:', error);
      throw new Error(`Settings cleanup-data failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Destroy all feedback data
   * Channel: settings:destroy-feedback
   */
  async destroyFeedback(confirmation: string): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const response = await this.api.settings.destroyFeedback({ confirmation });
      return response;
    } catch (error) {
      console.error('[IPC] Settings destroy-feedback failed:', error);
      throw new Error(`Settings destroy-feedback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // Notifications Operations
  // =============================================================================

  /**
   * Send test notification
   * Channel: notifications:send-test
   */
  async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.notifications.sendTest();
      return response;
    } catch (error) {
      console.error('[IPC] Notifications send-test failed:', error);
      throw new Error(`Notifications send-test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Configure notification settings
   * Channel: notifications:configure
   */
  async configureNotifications(settings: Partial<{
    enabled: boolean;
    doNotDisturb: { enabled: boolean; startTime: string; endTime: string };
    soundEnabled: boolean;
  }>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.notifications.configure(settings);
      return response;
    } catch (error) {
      console.error('[IPC] Notifications configure failed:', error);
      throw new Error(`Notifications configure failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const ipcClient = new IPCClient();

// Export class for testing
export default IPCClient;
