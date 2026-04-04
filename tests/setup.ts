/**
 * Vitest setup file
 * Configure test environment before running tests
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { Window } from 'happy-dom';

// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.VITEST = 'true';

// Initialize happy-dom window if not already present
if (!global.window || typeof global.window.document === 'undefined') {
  const happyWindow = new Window();

  // Cast through unknown to bypass strict type checking for happy-dom globals
  // Note: happy-dom has different type signatures than native DOM types
  global.window = happyWindow as unknown as typeof global.window;
  global.document = happyWindow.document as unknown as typeof global.document;
  global.HTMLElement = happyWindow.HTMLElement as unknown as typeof global.HTMLElement;
  global.Element = happyWindow.Element as unknown as typeof global.Element;
  global.Node = happyWindow.Node as unknown as typeof global.Node;
}

// Sync happy-dom navigator to global so react-dom sees userAgent, etc.
Object.defineProperty(global, 'navigator', {
  configurable: true,
  value: global.window.navigator,
});

// happy-dom does not provide dialog functions — mock them for React components
global.window.confirm = vi.fn().mockReturnValue(true);
global.window.alert = vi.fn();
global.window.prompt = vi.fn().mockReturnValue('');

const electronApi = {
  onboarding: {
    getStatus: vi.fn().mockResolvedValue({
      completed: false,
      currentStep: 1,
      readablePstCount: 0,
      outlookDirectory: null,
    }),
    detectOutlookDir: vi.fn().mockResolvedValue({
      detectedPath: null,
      reason: 'No default Outlook PST directory was detected.',
    }),
    validateOutlookDir: vi.fn().mockResolvedValue({
      valid: false,
      readablePstCount: 0,
      unreadablePstCount: 0,
      files: [],
      message: 'Select an Outlook data directory.',
    }),
    testLLMConnection: vi.fn().mockResolvedValue({
      success: false,
      responseTimeMs: null,
      message: 'Electron API unavailable in tests.',
    }),
    complete: vi.fn().mockResolvedValue({
      success: true,
    }),
  },
  runs: {
    start: vi.fn().mockResolvedValue({
      success: false,
      runId: null,
      message: 'Run execution is not mocked for this test.',
    }),
    getLatest: vi.fn().mockResolvedValue(null),
    getById: vi.fn().mockResolvedValue(null),
    listRecent: vi.fn().mockResolvedValue([]),
  },
  settings: {
    getAll: vi.fn().mockResolvedValue({
      outlookDirectory: '',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
    }),
    getDataSummary: vi.fn().mockResolvedValue({
      outlookDirectory: '',
      aiBaseUrl: 'https://api.openai.com/v1',
      aiModel: 'gpt-4.1-mini',
      databasePath: '',
      databaseSizeBytes: 0,
    }),
    clearRuns: vi.fn().mockResolvedValue({
      success: true,
      deletedRunCount: 0,
    }),
    rebuildIndex: vi.fn().mockResolvedValue({
      success: true,
      message: 'Index rebuild completed.',
    }),
  },
};

const testWindow = global.window as unknown as typeof global.window & {
  electronAPI?: typeof electronApi;
};

testWindow.electronAPI = electronApi;

Object.defineProperty(global.navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Create IPC renderer mock
const mockIpcRenderer = {
  invoke: vi.fn().mockImplementation((channel: string, ..._args: unknown[]) => {
    switch (channel) {
      case 'onboarding:get-status':
        return Promise.resolve({
          completed: false,
          currentStep: 1,
          readablePstCount: 0,
          outlookDirectory: null,
        });
      case 'onboarding:detect-email-client':
        return Promise.resolve({
          detectedPath: null,
          reason: 'No default Outlook PST directory was detected.',
        });
      case 'onboarding:validate-email-path':
        return Promise.resolve({
          valid: false,
          readablePstCount: 0,
          unreadablePstCount: 0,
          files: [],
          message: 'Select an Outlook data directory.',
        });
      case 'onboarding:test-llm-connection':
        return Promise.resolve({
          success: false,
          responseTimeMs: null,
          message: 'Electron API unavailable in tests.',
        });
      case 'onboarding:complete-setup':
        return Promise.resolve({ success: true });
      case 'runs:start':
        return Promise.resolve({
          success: false,
          runId: null,
          message: 'Run execution is not mocked for this test.',
        });
      case 'runs:get-latest':
      case 'runs:get-by-id':
        return Promise.resolve(null);
      case 'runs:list-recent':
        return Promise.resolve([]);
      case 'settings:get-all':
        return Promise.resolve({
          outlookDirectory: '',
          aiBaseUrl: 'https://api.openai.com/v1',
          aiModel: 'gpt-4.1-mini',
        });
      case 'settings:update':
        return Promise.resolve({ success: true });
      case 'settings:get-data-summary':
        return Promise.resolve({
          outlookDirectory: '',
          aiBaseUrl: 'https://api.openai.com/v1',
          aiModel: 'gpt-4.1-mini',
          databasePath: '',
          databaseSizeBytes: 0,
        });
      case 'settings:clear-runs':
        return Promise.resolve({
          success: true,
          deletedRunCount: 0,
        });
      case 'settings:rebuild-index':
        return Promise.resolve({
          success: true,
          message: 'Index rebuild completed.',
        });
      default:
        return Promise.resolve({});
    }
  }),
  on: vi.fn().mockReturnValue({ off: vi.fn() }),
  once: vi.fn().mockReturnValue({ off: vi.fn() }),
  removeListener: vi.fn(),
  send: vi.fn(),
};

// Mock electron app.getPath, safeStorage, and ipcRenderer for tests
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') {
        return '/tmp/test-mailcopilot';
      }
      if (name === 'documents') {
        return '/tmp/test-documents';
      }
      if (name === 'appData') {
        return '/tmp/test-appdata';
      }
      if (name === 'home') {
        return '/tmp/test-home';
      }
      return '/tmp/test';
    },
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plainText: string) => {
      // Mock encryption by returning a Buffer with the plain text
      return Buffer.from(`encrypted:${plainText}`);
    },
    decryptString: (encrypted: Buffer) => {
      // Mock decryption by extracting the plain text from our mock format
      const str = encrypted.toString('utf-8');
      if (str.startsWith('encrypted:')) {
        return str.substring(10); // Remove 'encrypted:' prefix
      }
      return str;
    },
  },
  ipcRenderer: mockIpcRenderer,
}));

// Mock electron-log to avoid file I/O in tests
vi.mock('electron-log', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    transports: {
      file: {
        level: 'debug',
        format: '',
        maxSize: 0,
        file: '',
      },
      console: {
        level: 'debug',
      },
    },
  },
}));
