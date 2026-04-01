/**
 * Verification Tests for NotificationManager (T013)
 *
 * Tests the notification system implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Electron Notification
const { MockNotification, mockShow } = vi.hoisted(() => {
  const mockShow = vi.fn();
  const mockClose = vi.fn();

  const MockNotification = class {
    show = mockShow;
    close = mockClose;
    constructor(public options: any) {}
  };

  return { MockNotification, mockShow };
});

vi.mock('electron', () => ({
  Notification: MockNotification,
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

import NotificationManager, {
  NotificationType,
  NotificationPriority,
} from '@/notifications/NotificationManager.js';

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

      expect(mockShow).toHaveBeenCalled();
    });

    it('should not send notification when disabled', () => {
      NotificationManager.configure({ enabled: false });

      NotificationManager.send(
        NotificationType.SYSTEM,
        'Test Title',
        'Test Body'
      );

      expect(mockShow).not.toHaveBeenCalled();
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

      expect(mockShow).toHaveBeenCalledTimes(3);
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

      expect(mockShow).not.toHaveBeenCalled();
    });

    it('should allow notifications outside DND hours', () => {
      // Enable DND from 22:00 to 08:00
      NotificationManager.configure({
        doNotDisturb: {
          enabled: true,
          startTime: { hour: 22, minute: 0 },
          endTime: { hour: 8, minute: 0 },
        },
      });

      // Mock current time to 10:00 (outside DND)
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date('2024-01-01T10:00:00').getTime()
      );

      NotificationManager.send(
        NotificationType.SYSTEM,
        'Test',
        'Body'
      );

      expect(mockShow).toHaveBeenCalled();
    });

    it('should handle overnight DND schedule', () => {
      NotificationManager.configure({
        doNotDisturb: {
          enabled: true,
          startTime: { hour: 22, minute: 0 },
          endTime: { hour: 8, minute: 0 },
        },
      });

      // At 03:00, DND should be active
      vi.spyOn(Date, 'now').mockReturnValue(
        new Date('2024-01-01T03:00:00').getTime()
      );

      NotificationManager.send(
        NotificationType.SYSTEM,
        'Test',
        'Body'
      );

      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('Occurrence Limiting', () => {
    it('should limit identical notifications to max 2', () => {
      // Send same notification 3 times
      for (let i = 0; i < 3; i++) {
        NotificationManager.send(
          NotificationType.ITEM_GENERATION,
          'Same Title',
          'Same Body',
          NotificationPriority.NORMAL
        );
      }

      // Should only show 2 times (limited)
      expect(mockShow).toHaveBeenCalledTimes(2);
    });

    it('should not limit urgent notifications', () => {
      // Send urgent notification 3 times
      for (let i = 0; i < 3; i++) {
        NotificationManager.send(
          NotificationType.ITEM_GENERATION,
          'Urgent',
          'Body',
          NotificationPriority.URGENT
        );
      }

      // Should show all 3 times
      expect(mockShow).toHaveBeenCalledTimes(3);
    });
  });

  describe('Notification Aggregation', () => {
    it('should aggregate multiple notifications', async () => {
      // Send multiple notifications quickly
      NotificationManager.send(
        NotificationType.ITEM_GENERATION,
        'Title 1',
        'Body 1'
      );
      NotificationManager.send(
        NotificationType.ITEM_GENERATION,
        'Title 2',
        'Body 2'
      );

      // Wait for aggregation window
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockShow).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should get current configuration', () => {
      const config = NotificationManager.getConfiguration();

      expect(config.enabled).toBe(true);
      expect(config.doNotDisturb.enabled).toBe(false);
    });

    it('should update configuration', () => {
      NotificationManager.configure({ enabled: false });

      const config = NotificationManager.getConfiguration();

      expect(config.enabled).toBe(false);
    });
  });

  describe('Test Notification', () => {
    it('should send test notification', () => {
      NotificationManager.sendTest();

      expect(mockShow).toHaveBeenCalled();
    });
  });
});
