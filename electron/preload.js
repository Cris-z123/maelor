/**
 * Preload Script for Electron Renderer Process
 *
 * This script runs in the renderer process before the web page loads.
 * It uses Electron's contextBridge to expose a safe API to the renderer.
 *
 * @see https://www.electronjs.org/docs/latest/tutorial/context-isolation
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposed API for renderer process
 * Only specific IPC channels are exposed (whitelist approach per constitution Principle V)
 */
const electronAPI = {
  // LLM Operations
  llm: {
    generate: (emailBatch) => ipcRenderer.invoke('llm:generate', emailBatch),
  },

  // Database Operations (exposed as 'db' for renderer ipcClient)
  db: {
    queryHistory: (request) => ipcRenderer.invoke('db:query:history', request),
    export: (request) => ipcRenderer.invoke('db:export', request),
  },

  // Configuration Management
  config: {
    get: (keys) => ipcRenderer.invoke('config:get', { keys }),
    set: (updates) => ipcRenderer.invoke('config:set', { updates }),
  },

  // Application Updates
  app: {
    checkUpdate: (mode) => ipcRenderer.invoke('app:check-update', mode),
  },

  // Email Metadata Fetching
  email: {
    fetchMeta: (filePath, format) => ipcRenderer.invoke('email:fetch-meta', { filePath, format }),
  },

  // Onboarding Operations
  onboarding: {
    getStatus: () => ipcRenderer.invoke('onboarding:get-status'),
    setStep: (step) => ipcRenderer.invoke('onboarding:set-step', step),
    detectEmailClient: (type) => ipcRenderer.invoke('onboarding:detect-email-client', type),
    validateEmailPath: (path, clientType) => ipcRenderer.invoke('onboarding:validate-email-path', path, clientType),
    testLLMConnection: (config) => ipcRenderer.invoke('onboarding:test-llm-connection', config),
    completeSetup: (request) => ipcRenderer.invoke('onboarding:complete-setup', request),
  },

  runs: {
    start: () => ipcRenderer.invoke('runs:start'),
    getLatest: () => ipcRenderer.invoke('runs:get-latest'),
    getById: (request) => ipcRenderer.invoke('runs:get-by-id', request),
    listRecent: (request) => ipcRenderer.invoke('runs:list-recent', request),
  },

  settings: {
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    update: (request) => ipcRenderer.invoke('settings:update', request),
    getDataSummary: () => ipcRenderer.invoke('settings:get-data-summary'),
    clearRuns: () => ipcRenderer.invoke('settings:clear-runs'),
    rebuildIndex: () => ipcRenderer.invoke('settings:rebuild-index'),
  },

  // Event listeners for renderer-to-main communication
  on: (channel, callback) => {
    const validChannels = [
      'llm:progress',
      'llm:complete',
      'llm:error',
      'config:changed',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Remove event listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

// Expose the API to renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
