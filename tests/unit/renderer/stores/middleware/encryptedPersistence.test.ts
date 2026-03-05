import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// Mock Electron safeStorage
const mockSafeStorage = {
  encryptString: vi.fn((plaintext: string) => `encrypted:${plaintext}`),
  decryptString: vi.fn((ciphertext: string) => ciphertext.replace('encrypted:', '')),
  isEncryptionAvailable: vi.fn(() => true),
};

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
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
        persist(
          () => ({
            apiKey: '',
            publicData: '',
          }),
          createEncryptedPersistence<TestState>({
            name: 'test-store',
            sensitiveFields: ['apiKey'],
            safeStorage: mockSafeStorage as any,
          })
        )
      );

    const store = createStore();
    store.setState({ apiKey: 'secret-key', publicData: 'public' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.apiKey).toBe('encrypted:secret-key');
    expect(saved.state.publicData).toBe('public');
  });

  it('decrypts sensitive fields on load', () => {
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

    // Test decryption logic by directly testing the storage's getItem
    const storageConfig = createEncryptedPersistence<TestState>({
      name: 'test-store',
      sensitiveFields: ['apiKey'],
      safeStorage: mockSafeStorage as any,
    });

    const decryptedString = storageConfig.storage.getItem('test-store');
    expect(decryptedString).toBeTruthy();

    const decrypted = JSON.parse(decryptedString!);
    expect(decrypted.state.apiKey).toBe('secret-key');
    expect(decrypted.state.publicData).toBe('public');
    expect(mockSafeStorage.decryptString).toHaveBeenCalledWith('encrypted:secret-key');
  });

  it('stores non-sensitive fields as plaintext', () => {
    interface TestState {
      apiKey: string;
      theme: string;
    }

    const createStore = () =>
      create<TestState>()(
        persist(
          () => ({
            apiKey: '',
            theme: '',
          }),
          createEncryptedPersistence<TestState>({
            name: 'test-store',
            sensitiveFields: ['apiKey'],
            safeStorage: mockSafeStorage as any,
          })
        )
      );

    const store = createStore();
    store.setState({ apiKey: 'secret', theme: 'dark' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.theme).toBe('dark');
  });

  it('gracefully degrades when safeStorage unavailable', () => {
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

    interface TestState {
      apiKey: string;
    }

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const createStore = () =>
      create<TestState>()(
        persist(
          () => ({
            apiKey: '',
          }),
          createEncryptedPersistence<TestState>({
            name: 'test-store',
            sensitiveFields: ['apiKey'],
            safeStorage: mockSafeStorage as any,
          })
        )
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
