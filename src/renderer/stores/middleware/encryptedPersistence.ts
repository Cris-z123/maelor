import { StateStorage, createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from 'electron';

interface EncryptedPersistenceConfig<T> {
  name: string;
  sensitiveFields: (keyof T)[];
  storage?: StateStorage;
}

/**
 * Custom Zustand persistence middleware with field-level encryption
 *
 * Per constitution v1.1.0:
 * - Uses Electron safeStorage for AES-256-GCM encryption
 * - Only encrypts sensitive fields (API keys, file paths)
 * - Non-sensitive fields remain plaintext for debugging
 * - Graceful degradation if safeStorage unavailable
 */
export function createEncryptedPersistence<T extends object>({
  name,
  sensitiveFields,
  storage = createJSONStorage(() => localStorage),
}: EncryptedPersistenceConfig<T>) {
  const encryptionAvailable = safeStorage.isEncryptionAvailable();

  if (!encryptionAvailable) {
    console.warn(
      `[encryptedPersistence] safeStorage unavailable, storing plaintext: ${name}`
    );
  }

  // Create custom storage with encryption/decryption
  const encryptedStorage: StateStorage = {
    ...storage,
    getItem: (key): string | null => {
      const value = storage.getItem(key);
      if (!value) return null;

      try {
        const parsed = JSON.parse(value);
        const state = parsed.state as T;

        // Decrypt sensitive fields
        if (encryptionAvailable && state) {
          for (const field of sensitiveFields) {
            const fieldValue = (state as any)[field];
            if (typeof fieldValue === 'string' && fieldValue.startsWith('encrypted:')) {
              try {
                (state as any)[field] = safeStorage.decryptString(fieldValue);
              } catch (error) {
                console.error(`[encryptedPersistence] Failed to decrypt ${String(field)}:`, error);
              }
            }
          }
        }

        parsed.state = state;
        return JSON.stringify(parsed);
      } catch (error) {
        console.error(`[encryptedPersistence] Failed to parse storage:`, error);
        return null;
      }
    },
    setItem: (key, newValue): void => {
      try {
        const parsed = JSON.parse(newValue);
        const state = { ...parsed.state } as T;

        // Encrypt sensitive fields
        if (encryptionAvailable && state) {
          for (const field of sensitiveFields) {
            const fieldValue = (state as any)[field];
            if (fieldValue !== undefined && fieldValue !== null) {
              try {
                (state as any)[field] = safeStorage.encryptString(String(fieldValue));
              } catch (error) {
                console.error(`[encryptedPersistence] Failed to encrypt ${String(field)}:`, error);
              }
            }
          }
        }

        parsed.state = state;
        storage.setItem(key, JSON.stringify(parsed));
      } catch (error) {
        console.error(`[encryptedPersistence] Failed to serialize storage:`, error);
        storage.setItem(key, newValue);
      }
    },
  };

  // Return persist configuration
  return persist(
    (config: any) => config,
    {
      name,
      storage: encryptedStorage,
      partialize: (state: T) => state,
    }
  );
}
