/**
 * Verification Tests for NotificationManager (T013)
 *
 * Tests the notification system implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Notification, BrowserWindow } from 'electron';
import NotificationManager, {
  NotificationType,
  NotificationPriority,
  type NotificationConfig,
} from '../../../src/main/notifications/NotificationManager.js';

// Mock Electron Notification API
const mockNotificationShow = vi.fn();
const mockNotificationClose = vi.fn();

class MockNotification {
  show = mockNotificationShow;
  close = mockNotificationClose;
  constructor(public options: any) {}
}

vi.mock('electron', () => ({
  Notification: MockNotification,
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

describe('T013: NotificationManager Implementation', () => {
  beforeEach(() => {
    // Reset notification state before each test
    NotificationManager.configure({
      enabled: true,
      doNotDisturb: {
        enabled: false,
        startTime: { hour: 22, minute: 0 },
        endTime: { hour: 8, minute: 0 },
      },
      sound: false,
      aggregationWindow: 100, // Short window for testing
    });
    NotificationManager.resetOccurrenceCounts();
    vi.clearAllMocks();
  });

  describe('Basic Notification Sending', () => {
    it('should send notification when enabled', () => {
      NotificationManager.send(
        NotificationType.SYSTEM,
        'Test Title',
        'Test Body',
        NotificationPriority.NORMAL
      );

      expect(mockNotificationShow).toHaveBeenCalled();
    });

    it('should not send notification when disabled', () => {
      NotificationManager.configure({ enabled: false });

      NotificationManager.send(
        NotificationType.SYSTEM,
        'Test Title',
        'Test Body'
      );

      expect(mockNotificationShow).not.toHaveBeenCalled();
    });

    it('should use correct priority levels', () => {
      const priorities = [
        NotificationPriority.LOW,
        NotificationPriority.NORMAL,
        NotificationPriority.URGENT,
      ];

      priorities.forEach((priority) => {
        NotificationManager.send(
          NotificationType.SYSTEM,
          'Test',
          'Body',
          priority
        );
      });

      expect(mockNotificationShow).toHaveBeenCalledTimes(3);
    });
  });

  describe('Do-Not-Disturb Mode', () => {
    it('should respect DND during active hours', () => {
      // Enable DND from 22:00 to 08:00
      NotificationManager.configure({
        doNotDisturb: {
          enabled: true,
          startTime: { hour: 22, minute: 0 },
          endTime: { hour: 8, minute: 0 },
        },
      });

      // Mock current time to 23:00
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date('2024-01-01T23:00:00').getTime()
      );

      NotificationManager.send(
        NotificationType.SYSTEM,
        'Test',
        'Body'
      );

      expect(mockNotificationShow).not.toHaveBeenCalled();
    });

    it('should allow notifications outside DND hours', () => {
      NotificationManager.configure({
        doNotDisturb: {
          enabled: true,
          startTime: { hour: 22, minute: 0 },
          endTime: { hour: 8, minute: 0 },
        },
      });

      // Mock current time to 10:00
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date('2024-01-01T10:00:00').getTime()
      );

      NotificationManager.send(
        NotificationType.SYSTEM,
        'Test',
        'Body'
      );

      expect(mockNotificationShow).toHaveBeenCalled();
    });

    it('should handle overnight DND schedule', () => {
      NotificationManager.configure({
        doNotDisturb: {
          enabled: true,
          startTime: { hour: 22, minute: 0 },
          endTime: { hour: 8, minute: 0 },
        },
      });

      // Test at 00:00 (midnight) - should be in DND
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date('2024-01-01T00:00:00').getTime()
      );

      expect(NotificationManager.isDoNotDisturbActive()).toBe(true);
    });
  });

  describe('Occurrence Limiting', () => {
    it('should limit identical notifications to max 2', () => {
      // Send 5 identical notifications
      for (let i = 0; i < 5; i++) {
        NotificationManager.send(
          NotificationType.SYSTEM,
          'Same Title',
          'Body',
          NotificationPriority.NORMAL
        );
      }

      // Should only send first 2
      expect(mockNotificationShow).toHaveBeenCalledTimes(2);
    });

    it('should not limit urgent notifications', () => {
      // Send 5 urgent notifications
      for (let i = 0; i < 5; i++) {
        NotificationManager.send(
          NotificationType.SYSTEM,
          'Same Title',
          'Body',
          NotificationPriority.URGENT
        );
      }

      // Urgent notifications bypass limit
      expect(mockNotificationShow).toHaveBeenCalledTimes(5);
    });
  });

  describe('Notification Aggregation', () => {
    it('should aggregate multiple notifications', () => {
      // Speed up time to trigger aggregation
      vi.useFakeTimers();

      NotificationManager.send(NotificationType.REPORT_COMPLETE, 'Report 1', 'Body');
      NotificationManager.send(NotificationType.REPORT_COMPLETE, 'Report 2', 'Body');

      // Fast-forward past aggregation window
      vi.advanceTimersByTime(200);

      expect(mockNotificationShow).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should get current configuration', () => {
      const config = NotificationManager.getConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('doNotDisturb');
      expect(config).toHaveProperty('sound');
      expect(config).toHaveProperty('aggregationWindow');
    });

    it('should update configuration', () => {
      NotificationManager.configure({
        enabled: false,
        sound: false,
      });

      const config = NotificationManager.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.sound).toBe(false);
    });
  });

  describe('Test Notification', () => {
    it('should send test notification', () => {
      NotificationManager.sendTest();

      expect(mockNotificationShow).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', () => {
      // Should not throw even with invalid input
      expect(() => {
        NotificationManager.send(
          NotificationType.SYSTEM,
          '',
          ''
        );
      }).not.toThrow();
    });
  });
});
