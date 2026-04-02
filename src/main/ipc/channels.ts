/**
 * IPC Channel Definitions
 *
 * All IPC channels used in the application.
 * Channels are whitelisted per Constitution Principle V.
 *
 * Naming convention: domain:action (e.g., llm:generate, db:query:history)
 */

export const IPC_CHANNELS = {
  // LLM processing
  LLM_GENERATE: 'llm:generate',

  // Database queries
  DB_QUERY_HISTORY: 'db:query:history',

  // Database export
  DB_EXPORT: 'db:export',

  // Configuration management
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',

  // Update checking
  APP_CHECK_UPDATE: 'app:check-update',
  APP_DOWNLOAD_UPDATE: 'app:download-update',

  // Email metadata fetching
  EMAIL_FETCH_META: 'email:fetch-meta',

  // Feedback submission
  FEEDBACK_SUBMIT: 'feedback:submit',
  FEEDBACK_STATS: 'feedback:stats',
  FEEDBACK_EXPORT: 'feedback:export',
  FEEDBACK_DESTROY: 'feedback:destroy',

  // Retention cleanup (US6: Configurable data retention)
  RETENTION_GET_CONFIG: 'retention:get-config',
  RETENTION_SET_PERIODS: 'retention:set-periods',
  RETENTION_GET_PREVIEW: 'retention:get-preview',
  RETENTION_MANUAL_CLEANUP: 'retention:manual-cleanup',
  RETENTION_GET_STORAGE: 'retention:get-storage',

  // Onboarding / First-run disclosure
  ONBOARDING_GET_STATUS: 'onboarding:get-status',
  ONBOARDING_ACKNOWLEDGE: 'onboarding:acknowledge',
  ONBOARDING_SET_STEP: 'onboarding:set-step',
  ONBOARDING_DETECT_EMAIL_CLIENT: 'onboarding:detect-email-client',
  ONBOARDING_VALIDATE_EMAIL_PATH: 'onboarding:validate-email-path',
  ONBOARDING_TEST_LLM_CONNECTION: 'onboarding:test-llm-connection',
  ONBOARDING_COMPLETE_SETUP: 'onboarding:complete-setup',

  // Report generation
  GENERATION_START: 'generation:start',
  GENERATION_CANCEL: 'generation:cancel',
  GENERATION_GET_PROGRESS: 'generation:get-progress',

  // Reports
  REPORTS_GET_TODAY: 'reports:get-today',
  REPORTS_GET_BY_DATE: 'reports:get-by-date',
  REPORTS_SEARCH: 'reports:search',
  REPORTS_EXPAND_ITEM: 'reports:expand-item',
  REPORTS_SUBMIT_FEEDBACK: 'reports:submit-feedback',
  REPORTS_COPY_SEARCH_TERM: 'reports:copy-search-term',
  REPORTS_INLINE_EDIT: 'reports:inline-edit',

  // Settings
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_CLEANUP_DATA: 'settings:cleanup-data',
  SETTINGS_DESTROY_FEEDBACK: 'settings:destroy-feedback',

  // Notifications
  NOTIFICATIONS_SEND_TEST: 'notifications:send-test',
  NOTIFICATIONS_CONFIGURE: 'notifications:configure',

  // Mode switching (US5: Dual-mode operation)
  MODE_GET: 'mode:get',
  MODE_SWITCH: 'mode:switch',
  MODE_CANCEL: 'mode:cancel',

  // Active run flow
  RUNS_START: 'runs:start',
  RUNS_GET_LATEST: 'runs:get-latest',
  RUNS_GET_BY_ID: 'runs:get-by-id',
  RUNS_LIST_RECENT: 'runs:list-recent',
  SETTINGS_GET_DATA_SUMMARY: 'settings:get-data-summary',
  SETTINGS_CLEAR_RUNS: 'settings:clear-runs',
  SETTINGS_REBUILD_INDEX: 'settings:rebuild-index',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

/**
 * Validate that a channel name is in the whitelist
 */
export function isValidChannel(channel: string): channel is IPCChannel {
  return Object.values(IPC_CHANNELS).includes(channel as IPCChannel);
}

/**
 * Get all channel names
 */
export function getAllChannels(): IPCChannel[] {
  return Object.values(IPC_CHANNELS);
}

export default IPC_CHANNELS;
