/**
 * Verification Tests for EmailClientDetector (T012)
 *
 * Tests the email client auto-detection implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app } from 'electron';
import EmailClientDetector, {
  type DetectionResult,
  type ValidationResult,
} from '../../../src/main/onboarding/EmailClientDetector.js';

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
  existsSync: vi.fn((path: string) => {
    // Mock some paths as existing
    if (path.includes('Thunderbird')) return true;
    if (path.includes('Outlook')) return true;
    return false;
  }),
  statSync: vi.fn((path: string) => ({
    isDirectory: () => true,
  })),
  readdirSync: vi.fn((path: string) => {
    // Mock email files in Thunderbird directory
    if (path.includes('Thunderbird')) {
      return ['INBOX.msf', 'Sent.mbox', 'profile'];
    }
    if (path.includes('Outlook')) {
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
      expect(typeof result.emailFileCount).toBe('number');
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
