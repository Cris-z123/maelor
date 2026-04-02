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
  // Onboarding Operations
  onboarding: {
    getStatus: () => ipcRenderer.invoke('onboarding:get-status'),
    detectOutlookDir: () => ipcRenderer.invoke('onboarding:detect-email-client'),
    validateOutlookDir: ({ directoryPath }) => ipcRenderer.invoke('onboarding:validate-email-path', directoryPath, 'outlook'),
    testLLMConnection: (config) => ipcRenderer.invoke('onboarding:test-llm-connection', config),
    complete: (request) => ipcRenderer.invoke('onboarding:complete-setup', request),
  },

  runs: {
    start: () => ipcRenderer.invoke('runs:start'),
    getLatest: () => ipcRenderer.invoke('runs:get-latest'),
    getById: (request) => ipcRenderer.invoke('runs:get-by-id', request),
    listRecent: (request) => ipcRenderer.invoke('runs:list-recent', request),
  },

  settings: {
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    update: (request) => ipcRenderer.invoke('settings:update', { updates: request }),
    getDataSummary: () => ipcRenderer.invoke('settings:get-data-summary'),
    clearRuns: () => ipcRenderer.invoke('settings:clear-runs'),
    rebuildIndex: () => ipcRenderer.invoke('settings:rebuild-index'),
  },
};

// Expose the API to renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
