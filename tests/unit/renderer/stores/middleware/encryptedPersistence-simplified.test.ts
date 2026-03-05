import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
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

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createEncryptedPersistence } from '@renderer/stores/middleware/encryptedPersistence';

describe('createEncryptedPersistence - Simplified', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should work with standard persist first', () => {
    interface TestState {
      apiKey: string;
      publicData: string;
    }

    // Use standard persist first to verify test setup
    const createStore = () =>
      create<TestState>()(
        persist(
          () => ({
            apiKey: '',
            publicData: '',
          }),
          {
            name: 'test-standard',
            storage: createJSONStorage(() => localStorage),
          }
        )
      );

    const store = createStore();
    store.setState({ apiKey: 'test-key', publicData: 'public' });

    const saved = JSON.parse(localStorage.getItem('test-standard')!);
    expect(saved.state.apiKey).toBe('test-key');
    expect(saved.state.publicData).toBe('public');
  });

  it('encrypts sensitive fields', () => {
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
            name: 'test-encrypted',
            sensitiveFields: ['apiKey'],
            safeStorage: mockSafeStorage as any,
          })
        )
      );

    const store = createStore();
    store.setState({ apiKey: 'secret-key', publicData: 'public' });

    // Verify encryption was called
    expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('secret-key');

    // Check stored value
    const savedString = localStorage.getItem('test-encrypted');
    expect(savedString).toBeTruthy();

    const saved = JSON.parse(savedString!);
    expect(saved.state.apiKey).toBe('encrypted:secret-key');
    expect(saved.state.publicData).toBe('public');
  });

  it('standard persist hydration works', () => {
    interface TestState {
      apiKey: string;
      publicData: string;
    }

    const createStandardStore = () =>
      create<TestState>()(
        persist(
          () => ({
            apiKey: '',
            publicData: '',
          }),
          {
            name: 'test-standard-hydration',
            storage: createJSONStorage(() => localStorage),
          }
        )
      );

    // First store: set some state
    const store1 = createStandardStore();
    store1.setState({ apiKey: 'test-key', publicData: 'public' });

    // Create second store with same name - should hydrate from localStorage
    const store2 = createStandardStore();
    const state2 = store2.getState();

    expect(state2.apiKey).toBe('test-key');
    expect(state2.publicData).toBe('public');
  });

  it('decrypts on load - manual hydration test', () => {
    interface TestState {
      apiKey: string;
      publicData: string;
    }

    const createTestStore = () =>
      create<TestState>()(
        persist(
          () => ({
            apiKey: '',
            publicData: '',
          }),
          createEncryptedPersistence<TestState>({
            name: 'test-manual-hydration',
            sensitiveFields: ['apiKey'],
            safeStorage: mockSafeStorage as any,
          })
        )
      );

    // First store: set some state
    const store1 = createTestStore();
    store1.setState({ apiKey: 'secret-key', publicData: 'public' });

    // Verify encryption happened
    const stored = JSON.parse(localStorage.getItem('test-manual-hydration')!);
    expect(stored.state.apiKey).toBe('encrypted:secret-key');
    expect(stored.state.publicData).toBe('public');

    // Verify decryption logic works by directly testing the storage's getItem
    const storageConfig = createEncryptedPersistence<TestState>({
      name: 'test-manual-hydration',
      sensitiveFields: ['apiKey'],
      safeStorage: mockSafeStorage as any,
    });

    const decryptedString = storageConfig.storage.getItem('test-manual-hydration');
    expect(decryptedString).toBeTruthy();

    const decrypted = JSON.parse(decryptedString!);
    expect(decrypted.state.apiKey).toBe('secret-key');
    expect(decrypted.state.publicData).toBe('public');
    expect(mockSafeStorage.decryptString).toHaveBeenCalledWith('encrypted:secret-key');
  });
});

