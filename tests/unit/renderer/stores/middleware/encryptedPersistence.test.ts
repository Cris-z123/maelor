import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock Electron safeStorage BEFORE importing the module
vi.mock('electron', () => ({
  safeStorage: {
    encryptString: vi.fn((plaintext: string) => `encrypted:${plaintext}`),
    decryptString: vi.fn((ciphertext: string) => ciphertext.replace('encrypted:', '')),
    isEncryptionAvailable: vi.fn(() => true),
  },
}));

import { createEncryptedPersistence } from '@renderer/stores/middleware/encryptedPersistence';

describe('createEncryptedPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  it('encrypts sensitive fields before saving', () => {
    interface TestState {
      apiKey: string;
      publicData: string;
    }

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    store.setState({ apiKey: 'secret-key', publicData: 'public' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.apiKey).toBe('encrypted:secret-key');
    expect(saved.state.publicData).toBe('public');
  });

  it('decrypts sensitive fields on hydration', () => {
    interface TestState {
      apiKey: string;
      publicData: string;
    }

    // Pre-populate localStorage with encrypted data
    localStorage.setItem(
      'test-store',
      JSON.stringify({
        state: {
          apiKey: 'encrypted:secret-key',
          publicData: 'public',
        },
        version: 0,
      })
    );

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    const state = store.getState();

    expect(state.apiKey).toBe('secret-key');
    expect(state.publicData).toBe('public');
    const { safeStorage } = require('electron');
    expect(safeStorage.decryptString).toHaveBeenCalledWith('encrypted:secret-key');
  });

  it('stores non-sensitive fields as plaintext', () => {
    interface TestState {
      apiKey: string;
      theme: string;
    }

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    store.setState({ apiKey: 'secret', theme: 'dark' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.theme).toBe('dark');
  });

  it('gracefully degrades when safeStorage unavailable', () => {
    const { safeStorage } = require('electron');
    safeStorage.isEncryptionAvailable.mockReturnValue(false);

    interface TestState {
      apiKey: string;
    }

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    store.setState({ apiKey: 'secret-key' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.apiKey).toBe('secret-key'); // Stored plaintext
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('safeStorage unavailable')
    );

    consoleWarn.mockRestore();
  });
});
