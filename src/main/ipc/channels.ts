export const IPC_CHANNELS = {
  ONBOARDING_GET_STATUS: 'onboarding:get-status',
  ONBOARDING_DETECT_EMAIL_CLIENT: 'onboarding:detect-email-client',
  ONBOARDING_VALIDATE_EMAIL_PATH: 'onboarding:validate-email-path',
  ONBOARDING_TEST_LLM_CONNECTION: 'onboarding:test-llm-connection',
  ONBOARDING_COMPLETE_SETUP: 'onboarding:complete-setup',
  RUNS_START: 'runs:start',
  RUNS_GET_LATEST: 'runs:get-latest',
  RUNS_GET_BY_ID: 'runs:get-by-id',
  RUNS_LIST_RECENT: 'runs:list-recent',
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
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
