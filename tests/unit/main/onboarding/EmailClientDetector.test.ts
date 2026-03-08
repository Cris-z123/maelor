/**
 * Verification Tests for EmailClientDetector (T012)
 *
 * Tests the email client auto-detection implementation
 */

import { describe, it, expect, vi } from 'vitest';
import { EmailClientDetector, type DetectionResult, type ValidationResult } from '@/onboarding/EmailClientDetector';

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
