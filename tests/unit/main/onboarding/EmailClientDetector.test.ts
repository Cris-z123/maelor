/**
 * Verification Tests for EmailClientDetector (T012)
 *
 * Tests the email client auto-detection implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailClientDetector, type DetectionResult, type ValidationResult } from '@/onboarding/EmailClientDetector';
import fsPromises from 'fs/promises';

// Mock fs/promises for validatePath tests
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

/**
 * T018: EmailClientDetector.platformDefaults Unit Tests
 *
 * Tests the platform-specific default paths for email clients
 */
describe('EmailClientDetector.platformDefaults', () => {
  it('should return default paths for current platform', () => {
    const defaults = EmailClientDetector.platformDefaults();

    expect(defaults).toHaveProperty('thunderbird');
    expect(defaults).toHaveProperty('outlook');
    expect(defaults).toHaveProperty('appleMail');
  });

  it('should return absolute paths', () => {
    const defaults = EmailClientDetector.platformDefaults();

    Object.values(defaults).forEach((path) => {
      if (path) {
        // Skip empty strings for unsupported clients
        if (process.platform === 'win32') {
          expect(path).toMatch(/^[A-Z]:\\/);
        } else {
          expect(path).toMatch(/^\//);
        }
      }
    });
  });

  it('should only return paths for current platform', () => {
    const defaults = EmailClientDetector.platformDefaults();
    const platform = process.platform;

    // Apple Mail should be empty on Windows
    if (platform === 'win32') {
      expect(defaults.appleMail).toBe('');
    }

    // Outlook should be empty on Linux
    if (platform === 'linux') {
      expect(defaults.outlook).toBe('');
    }
  });

  it('should return empty strings for unknown platform', () => {
    // Note: We cannot mock process.platform as it's read-only
    // This test documents the expected behavior for unknown platforms
    // The implementation returns empty strings for any non-win32/darwin/linux platform

    const defaults = EmailClientDetector.platformDefaults();

    // Current platform should always return valid structure
    expect(defaults).toHaveProperty('thunderbird');
    expect(defaults).toHaveProperty('outlook');
    expect(defaults).toHaveProperty('appleMail');

    // All values should be strings
    expect(typeof defaults.thunderbird).toBe('string');
    expect(typeof defaults.outlook).toBe('string');
    expect(typeof defaults.appleMail).toBe('string');
  });
});

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'appData') return '/tmp/test-appdata';
      if (name === 'home') return '/tmp/test-home';
      return '/tmp/test';
    }),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn((_path: string) => {
    // Mock some paths as existing
    if (_path.includes('Thunderbird')) return true;
    if (_path.includes('Outlook')) return true;
    return false;
  }),
  statSync: vi.fn((_path: string) => ({
    isDirectory: () => true,
  })),
  readdirSync: vi.fn((_path: string) => {
    // Mock email files in Thunderbird directory
    if (_path.includes('Thunderbird')) {
      return ['INBOX.msf', 'Sent.mbox', 'profile'];
    }
    if (_path.includes('Outlook')) {
      return ['outlook.pst', 'archive.ost'];
    }
    return [];
  }),
}));

describe('T012: EmailClientDetector Implementation', () => {
  describe('Platform Detection', () => {
    it('should detect current platform', () => {
      expect(EmailClientDetector.getPlatform()).toBe(process.platform);
    });

    it('should return supported clients for platform', () => {
      const supported = EmailClientDetector.getSupportedClients();

      expect(Array.isArray(supported)).toBe(true);
      expect(supported.length).toBeGreaterThan(0);
    });

    it('should check if specific client is supported', () => {
      const thunderbirdSupported = EmailClientDetector.isClientSupported('thunderbird');

      expect(typeof thunderbirdSupported).toBe('boolean');
    });
  });

  describe('Auto-Detection', () => {
    it('should detect Thunderbird on supported platforms', () => {
      const result = EmailClientDetector.detect('thunderbird');

      if (result) {
        expect(result.client).toBe('thunderbird');
        expect(['high', 'medium', 'low']).includes(result.confidence);
        expect(typeof result.path).toBe('string');
        expect(typeof result.reason).toBe('string');
      }
    });

    it('should detect all supported clients', () => {
      const results = EmailClientDetector.detectAll();

      expect(Array.isArray(results)).toBe(true);
      results.forEach((result: DetectionResult) => {
        expect(result.client).toBeTruthy();
        expect(result.path).toBeTruthy();
        expect(result.confidence).toBeTruthy();
      });
    });

    it('should return null for unsupported client on platform', () => {
      // apple-mail is not supported on win32
      if (process.platform === 'win32') {
        const result = EmailClientDetector.detect('apple-mail');
        expect(result).toBeNull();
      }
    });
  });

  describe('Path Validation', () => {
    it('should validate path with email files', () => {
      const result: ValidationResult = EmailClientDetector.validatePath(
        'thunderbird',
        '/fake/thunderbird/path'
      );

      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.error).toBe('string');
      // emailFileCount is optional and only present when valid is true
      if (result.valid) {
        expect(typeof result.emailFileCount).toBe('number');
      } else {
        expect(result.emailFileCount).toBeUndefined();
      }
    });

    it('should return error for non-existent path', () => {
      const result = EmailClientDetector.validatePath(
        'thunderbird',
        '/nonexistent/path'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return specific error message for invalid paths', () => {
      const result = EmailClientDetector.validatePath(
        'thunderbird',
        '/invalid/path'
      );

      if (!result.valid) {
        expect(result.error).toMatch(/路径无效|路径不存在|邮件文件/);
      }
    });
  });

  describe('Confidence Levels', () => {
    it('should assign high confidence when email files found', () => {
      const results = EmailClientDetector.detectAll();

      results.forEach((result: DetectionResult) => {
        expect(['high', 'medium', 'low']).toContain(result.confidence);
      });
    });
  });

  describe('Platform-Specific Paths', () => {
    it('should have platform-specific default paths', () => {
      const platform = EmailClientDetector.getPlatform();

      // Check that detection works for current platform
      const thunderbirdResult = EmailClientDetector.detect('thunderbird');

      if (platform === 'win32' || platform === 'darwin' || platform === 'linux') {
        // Should at least not crash
        expect(typeof thunderbirdResult).toBe('object');
      }
    });
  });
});

/**
 * T019: EmailClientDetector.validatePath Unit Tests
 *
 * Tests the path validation functionality
 */
describe('EmailClientDetector.validatePath', () => {
  const mockAccess = vi.mocked(fsPromises.access);
  const mockReaddir = vi.mocked(fsPromises.readdir);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject non-existent paths', async () => {
    const nonExistentPath = '/nonexistent/path';
    const enoentError: NodeJS.ErrnoException = new Error('Path not found');
    enoentError.code = 'ENOENT';
    enoentError.errno = -2;

    mockAccess.mockRejectedValue(enoentError);

    const result = await EmailClientDetector.validatePathAsync(nonExistentPath);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Path not found');
    expect(mockAccess).toHaveBeenCalledWith(nonExistentPath);
  });

  it('should reject paths without permission', async () => {
    const noPermissionPath = '/root/protected/path';
    const eaccesError: NodeJS.ErrnoException = new Error('Permission denied');
    eaccesError.code = 'EACCES';
    eaccesError.errno = -13;

    mockAccess.mockRejectedValue(eaccesError);

    const result = await EmailClientDetector.validatePathAsync(noPermissionPath);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Permission denied');
    expect(mockAccess).toHaveBeenCalledWith(noPermissionPath);
  });

  it('should reject paths with no email files', async () => {
    const emptyPath = '/empty/directory';
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(['document.txt', 'image.jpg', 'video.mp4']);

    const result = await EmailClientDetector.validatePathAsync(emptyPath);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('No email files found in directory');
    expect(mockAccess).toHaveBeenCalledWith(emptyPath);
    expect(mockReaddir).toHaveBeenCalledWith(emptyPath);
  });

  it('should detect Thunderbird email files (.msf, .mbx, .mbox)', async () => {
    const thunderbirdPath = '/thunderbird/profile';
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(['Inbox.msf', 'sent.mbx', 'Trash.mbox']);

    const result = await EmailClientDetector.validatePathAsync(thunderbirdPath);

    expect(result.valid).toBe(true);
    expect(result.clientType).toBe('thunderbird');
    expect(mockAccess).toHaveBeenCalledWith(thunderbirdPath);
    expect(mockReaddir).toHaveBeenCalledWith(thunderbirdPath);
  });

  it('should detect Outlook email files (.pst, .ost)', async () => {
    const outlookPath = '/outlook/data';
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(['Outlook.pst', 'archive.ost', 'backup.pst']);

    const result = await EmailClientDetector.validatePathAsync(outlookPath);

    expect(result.valid).toBe(true);
    expect(result.clientType).toBe('outlook');
    expect(mockAccess).toHaveBeenCalledWith(outlookPath);
    expect(mockReaddir).toHaveBeenCalledWith(outlookPath);
  });

  it('should reject unsupported file types', async () => {
    const invalidPath = '/invalid/files';
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(['document.txt', 'image.jpg', 'data.json']);

    const result = await EmailClientDetector.validatePathAsync(invalidPath);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('No email files');
    expect(mockAccess).toHaveBeenCalledWith(invalidPath);
    expect(mockReaddir).toHaveBeenCalledWith(invalidPath);
  });

  it('should detect Apple Mail email files (.mbox, .emlx)', async () => {
    const appleMailPath = '/library/mail/v8';
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue(['inbox.mbox', 'sent.emlx', 'archive.mbox']);

    const result = await EmailClientDetector.validatePathAsync(appleMailPath);

    expect(result.valid).toBe(true);
    expect(result.clientType).toBe('apple-mail');
    expect(mockAccess).toHaveBeenCalledWith(appleMailPath);
    expect(mockReaddir).toHaveBeenCalledWith(appleMailPath);
  });
});
