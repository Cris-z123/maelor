import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@/ipc/channels';
import DatabaseManager from '@/database/Database';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock electron ipcMain for integration tests
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    listeners: vi.fn(() => []),
    removeAllListeners: vi.fn(),
  },
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return '/tmp/test-mailcopilot';
      }
      return '/tmp/test';
    }),
  },
}));

describe('IPC Validation Integration', () => {
  let db: Database.Database;
  let testDbPath: string;
  const mockHandlers = new Map<string, Function>();
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    // Create file-based test database (in-memory doesn't support WAL properly)
    testDbPath = path.join(__dirname, `../../test-validation-${Date.now()}.db`);
    db = new Database(testDbPath);

    // Enable WAL mode and foreign keys
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');

    // Load schema
    const schemaPath = path.join(__dirname, '../../../src/main/database/migrations/001_initial_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Set the database instance for DatabaseManager
    DatabaseManager.setInstanceForTesting(db);

    // Setup ipcMain mock
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });

    vi.mocked(ipcMain.listeners).mockImplementation((channel: string) => {
      const handler = mockHandlers.get(channel);
      return handler ? [handler] : [];
    });
  });

  afterEach(() => {
    // Clean up
    mockHandlers.clear();
    vi.mocked(ipcMain.removeAllListeners).mockReset();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;

    // Clear module cache to reset isDevelopment
    vi.clearAllMocks();
    vi.resetModules();

    // Clean up test database file
    try {
      if (db) {
        db.close();
      }
      if (testDbPath && fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      // Also clean up WAL files
      if (testDbPath) {
        const walPath = testDbPath + '-wal';
        const shmPath = testDbPath + '-shm';
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    // Reset database instance
    DatabaseManager.resetInstanceForTesting();
  });

  describe('Environment Mode Switching', () => {
    it('should load validators in development mode', async () => {
      // Set NODE_ENV before importing registry
      process.env.NODE_ENV = 'development';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      expect(mockHandlers.size).toBeGreaterThan(0);
    });

    it('should load validators in production mode', async () => {
      // Set NODE_ENV before importing registry
      process.env.NODE_ENV = 'production';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      expect(mockHandlers.size).toBeGreaterThan(0);
    });
  });

  describe('Development Mode Error Structure', () => {
    it('should provide detailed errors with field and issues in development', async () => {
      process.env.NODE_ENV = 'development';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH);

      try {
        await handler({}, {});
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        // Development mode: detailed error structure
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('issues');
        expect(error.field).toBe('path');
        expect(Array.isArray(error.issues)).toBe(true);
        expect(error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should include field path in development errors', async () => {
      process.env.NODE_ENV = 'development';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_SET_STEP);

      try {
        await handler({}, { step: 5 });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        // Development mode: includes field path
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('field');
        expect(error.field).toBe('step');
      }
    });

    it('should include all Zod issues in development errors', async () => {
      process.env.NODE_ENV = 'development';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT);

      try {
        await handler({}, { type: 'invalid' });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        // Development mode: includes all Zod issues
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('issues');
        expect(Array.isArray(error.issues)).toBe(true);
        expect(error.issues.length).toBeGreaterThan(0);
        expect(error.issues[0]).toHaveProperty('message');
        expect(error.issues[0]).toHaveProperty('path');
      }
    });
  });

  describe('Production Mode Error Structure', () => {
    it('should provide generic errors without field/issues in production', async () => {
      process.env.NODE_ENV = 'production';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH);

      try {
        await handler({}, {});
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        // Production mode: generic error structure
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('error');
        expect(error.error).toBe('Invalid request data');
        expect(error).not.toHaveProperty('field');
        expect(error).not.toHaveProperty('issues');
      }
    });

    it('should not expose internal validation details in production', async () => {
      process.env.NODE_ENV = 'production';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_SET_STEP);

      try {
        await handler({}, { step: 5 });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        // Production mode: no internal details
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('error');
        expect(error.error).toBe('Invalid request data');
        expect(error).not.toHaveProperty('field');
        expect(error).not.toHaveProperty('issues');
      }
    });

    it('should use generic message for all validation errors in production', async () => {
      process.env.NODE_ENV = 'production';

      // Dynamic import to get fresh module with new isDevelopment value
      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);

      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT);

      try {
        await handler({}, { type: 'invalid' });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        // Production mode: generic message
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('error');
        expect(error.error).toBe('Invalid request data');
      }
    });
  });

  describe('Request Validation - All 6 Channels', () => {
    beforeEach(async () => {
      // Default to development mode for these tests
      process.env.NODE_ENV = 'development';

      const { IPCValidatorRegistry } = await import('@/ipc/validators/registry');
      const { registerOnboardingValidators } = await import('@/ipc/validators/onboarding');

      registerOnboardingValidators(IPCValidatorRegistry, db);
    });

    it('should validate get-status channel (empty request)', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_GET_STATUS);

      // Should accept empty object
      const response = await handler({}, {});

      expect(response).toBeDefined();
      expect(response).toHaveProperty('hasAcknowledgedDisclosure');
      expect(response).toHaveProperty('disclosureVersion');
    });

    it('should validate acknowledge channel (empty request)', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_ACKNOWLEDGE);

      // Should accept empty object
      const response = await handler({}, {});

      expect(response).toBeDefined();
      expect(response).toHaveProperty('success');
    });

    it('should validate test-llm-connection channel', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION);

      // Should accept valid request
      const response = await handler({}, {
        mode: 'local',
        localEndpoint: 'http://localhost:11434',
      });

      expect(response).toBeDefined();
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('responseTime');
    });

    it('should reject invalid email client type', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT);

      try {
        await handler({}, { type: 'invalid-type' });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('error');
      }
    });

    it('should reject missing required field in validate-email-path', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH);

      try {
        await handler({}, {});
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toHaveProperty('success', false);
      }
    });

    it('should reject invalid step number in set-step', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_SET_STEP);

      try {
        await handler({}, { step: 5 });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toHaveProperty('success', false);
      }
    });

    it('should reject invalid mode in test-llm-connection', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION);

      try {
        await handler({}, { mode: 'invalid-mode' });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toHaveProperty('success', false);
        expect(error).toHaveProperty('error');
      }
    });

    it('should reject extra fields in strict schema (get-status)', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_GET_STATUS);

      try {
        await handler({}, { extraField: 'should-fail' });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toHaveProperty('success', false);
      }
    });

    it('should reject extra fields in strict schema (acknowledge)', async () => {
      const handler = mockHandlers.get(IPC_CHANNELS.ONBOARDING_ACKNOWLEDGE);

      try {
        await handler({}, { unexpected: 'field' });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toHaveProperty('success', false);
      }
    });
  });

});
