import { StateStorage } from 'zustand/middleware';

// SafeStorage interface for Electron's safeStorage API
interface SafeStorage {
  encryptString(plaintext: string): string;
  decryptString(ciphertext: string): string;
  isEncryptionAvailable(): boolean;
}

interface EncryptedPersistenceConfig<T> {
  name: string;
  sensitiveFields: (keyof T)[];
  safeStorage: SafeStorage;
  storage?: StateStorage;
}

/**
 * Custom Zustand persistence middleware configuration with field-level encryption
 *
 * Per constitution v1.1.0:
 * - Uses Electron safeStorage for AES-256-GCM encryption
 * - Only encrypts sensitive fields (API keys, file paths)
 * - Non-sensitive fields remain plaintext for debugging
 * - Graceful degradation if safeStorage unavailable
 *
 * Usage:
 * ```ts
 * import { safeStorage } from 'electron';
 *
 * create(
 *   persist(
 *     (set, get) => ({ ... }),
 *     createEncryptedPersistence({
 *       name: 'my-store',
 *       sensitiveFields: ['apiKey'],
 *       safeStorage
 *     })
 *   )
 * )
 * ```
 */
export function createEncryptedPersistence<T extends object>({
  name,
  sensitiveFields,
  safeStorage,
  storage,
}: EncryptedPersistenceConfig<T>) {
  const encryptionAvailable = safeStorage.isEncryptionAvailable();

  if (!encryptionAvailable) {
    console.warn(
      `[encryptedPersistence] safeStorage unavailable, storing plaintext: ${name}`
    );
  }

  // Create custom storage with encryption/decryption
  const encryptedStorage: StateStorage = {
    getItem: (key): string | null => {
      const value = localStorage.getItem(key);
      if (!value) return null;

      try {
        // Parse and decrypt in one step
        const stored = JSON.parse(value);
        if (!stored.state) return null;

        // Decrypt sensitive fields by mutating the state object
        if (encryptionAvailable) {
          for (const field of sensitiveFields) {
            const fieldValue = (stored.state as any)[field];
            if (typeof fieldValue === 'string' && fieldValue.startsWith('encrypted:')) {
              try {
                (stored.state as any)[field] = safeStorage.decryptString(fieldValue);
              } catch (error) {
                console.error(`[encryptedPersistence] Failed to decrypt ${String(field)}:`, error);
              }
            }
          }
        }

        return JSON.stringify(stored);
      } catch (error) {
        console.error('[encryptedPersistence] Failed to parse storage value:', error);
        return null;
      }
    },
    setItem: (key, newValue): void => {
      try {
        // Parse the new value (always a string from zustand persist)
        const stored = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;

        // Encrypt sensitive fields by mutating the state object
        if (encryptionAvailable && stored.state) {
          for (const field of sensitiveFields) {
            const fieldValue = (stored.state as any)[field];
            if (fieldValue !== undefined && fieldValue !== null) {
              try {
                (stored.state as any)[field] = safeStorage.encryptString(String(fieldValue));
              } catch (error) {
                console.error(`[encryptedPersistence] Failed to encrypt ${String(field)}:`, error);
              }
            }
          }
        }

        localStorage.setItem(key, JSON.stringify(stored));
      } catch (error) {
        console.error('[encryptedPersistence] Failed to serialize storage:', error);
        // Fallback: store original value
        if (typeof newValue === 'string') {
          localStorage.setItem(key, newValue);
        }
      }
    },
    removeItem: (key): void => {
      localStorage.removeItem(key);
    },
  };

  // Return persist configuration object
  return {
    name,
    storage: encryptedStorage,
  };
}
