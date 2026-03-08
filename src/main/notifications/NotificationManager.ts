/**
 * NotificationManager
 *
 * Manages desktop notifications with do-not-disturb mode,
 * aggregation, and priority levels.
 *
 * Per plan.md T013, research.md decision #2
 */

import { Notification, BrowserWindow } from 'electron';
import { logger } from '../config/logger.js';

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  URGENT = 'urgent',
}

/**
 * Notification types
 */
export enum NotificationType {
  REPORT_COMPLETE = 'report_complete',
  ERROR = 'error',
  SYSTEM = 'system',
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  enabled: boolean;
  doNotDisturb: {
    enabled: boolean;
    startTime: { hour: number; minute: number }; // 22:00
    endTime: { hour: number; minute: number }; // 08:00
  };
  sound: boolean;
  aggregationWindow: number; // milliseconds (3 minutes = 180000)
}

/**
 * Queued notification
 */
interface QueuedNotification {
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  timestamp: number;
  onClick?: () => void;
}

/**
 * Notification Manager
 *
 * Features:
 * - Electron Notification API integration
 * - Do-not-disturb mode (22:00-08:00) with overnight support
 * - Notification aggregation (3-minute window)
 * - Priority levels (low: 3s, normal: 5s, urgent: persistent)
 * - Click handlers for actions ("View Report", etc.)
 * - Individual item notification limit (max 2 occurrences)
 */
class NotificationManager {
  private static config: NotificationConfig = {
    enabled: true,
    doNotDisturb: {
      enabled: true,
      startTime: { hour: 22, minute: 0 },
      endTime: { hour: 8, minute: 0 },
    },
    sound: true,
    aggregationWindow: 180000, // 3 minutes
  };

  private static queue: Map<string, QueuedNotification[]> = new Map();
  private static aggregationTimer: NodeJS.Timeout | null = null;
  private static occurrenceCount: Map<string, number> = new Map();
  private static occurrenceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Send notification
   * Respects do-not-disturb mode and aggregation
   */
  static send(
    type: NotificationType,
    title: string,
    body: string,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    onClick?: () => void
  ): void {
    try {
      // Check if notifications are enabled
      if (!this.config.enabled) {
        logger.debug('NotificationManager', 'Notifications disabled', {
          type,
          title,
        });
        return;
      }

      // Check do-not-disturb mode
      if (this.isDoNotDisturbActive()) {
        logger.debug('NotificationManager', 'Do-not-disturb active', {
          type,
          title,
        });
        return;
      }

      // Check occurrence limit (max 2 for individual items)
      const key = `${type}:${title}`;
      const count = this.occurrenceCount.get(key) || 0;
      if (count >= 2 && priority !== NotificationPriority.URGENT) {
        logger.debug('NotificationManager', 'Occurrence limit reached', {
          key,
          count,
        });
        return;
      }
      this.occurrenceCount.set(key, count + 1);

      // Add to aggregation queue
      this.addToQueue(type, title, body, priority, onClick);

      // Reset occurrence count after 1 hour
      // Clear existing timer if any
      const existingTimer = this.occurrenceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Create new timer and store reference
      const timer = setTimeout(() => {
        this.occurrenceCount.set(key, 0);
        this.occurrenceTimers.delete(key);
      }, 3600000);
      this.occurrenceTimers.set(key, timer);
    } catch (error) {
      logger.error('NotificationManager', 'Failed to send notification', {
        type,
        title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Add notification to aggregation queue
   */
  private static addToQueue(
    type: NotificationType,
    title: string,
    body: string,
    priority: NotificationPriority,
    onClick?: () => void
  ): void {
    const notification: QueuedNotification = {
      type,
      title,
      body,
      priority,
      timestamp: Date.now(),
      onClick,
    };

    // Group by type and priority
    const key = `${type}:${priority}`;
    if (!this.queue.has(key)) {
      this.queue.set(key, []);
    }
    this.queue.get(key)!.push(notification);

    // Set aggregation timer
    if (!this.aggregationTimer) {
      this.aggregationTimer = setTimeout(() => {
        this.flushQueue();
      }, this.config.aggregationWindow);
    }

    // Urgent notifications skip aggregation
    if (priority === NotificationPriority.URGENT) {
      this.flushQueue();
    }
  }

  /**
   * Flush aggregation queue and send notifications
   */
  private static flushQueue(): void {
    if (this.aggregationTimer) {
      clearTimeout(this.aggregationTimer);
      this.aggregationTimer = null;
    }

    for (const [, notifications] of this.queue.entries()) {
      if (notifications.length === 0) continue;

      // Aggregate if multiple notifications of same type
      if (notifications.length > 1) {
        const aggregated = this.aggregateNotifications(notifications);
        this.showNotification(
          aggregated.title,
          aggregated.body,
          notifications[0].priority,
          notifications[0].onClick
        );
      } else {
        const notif = notifications[0];
        this.showNotification(
          notif.title,
          notif.body,
          notif.priority,
          notif.onClick
        );
      }
    }

    this.queue.clear();
  }

  /**
   * Aggregate multiple notifications
   */
  private static aggregateNotifications(
    notifications: QueuedNotification[]
  ): { title: string; body: string } {
    const count = notifications.length;
    const first = notifications[0];

    if (first.type === NotificationType.REPORT_COMPLETE) {
      return {
        title: '报告生成完成',
        body: `${count} 份报告已生成完成`,
      };
    }

    if (first.type === NotificationType.ERROR) {
      return {
        title: '发生错误',
        body: `${count} 个错误需要关注`,
      };
    }

    return {
      title: '系统通知',
      body: `您有 ${count} 条新通知`,
    };
  }

  /**
   * Show notification using Electron API
   */
  private static showNotification(
    title: string,
    body: string,
    priority: NotificationPriority,
    onClick?: () => void
  ): void {
    try {
      const notification = new Notification({
        title,
        body,
        silent: !this.config.sound,
        urgency: priority === NotificationPriority.URGENT ? 'critical' : 'normal',
      });

      // Set timeout based on priority
      const timeout =
        priority === NotificationPriority.URGENT
          ? 0 // Persistent
          : priority === NotificationPriority.LOW
            ? 3000 // 3 seconds
            : 5000; // 5 seconds

      if (timeout > 0) {
        setTimeout(() => {
          notification.close();
        }, timeout);
      }

      // Handle click
      if (onClick) {
        notification.on('click', () => {
          // Focus main window
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.focus();
          }
          onClick();
        });
      }

      notification.show();

      logger.info('NotificationManager', 'Notification shown', {
        title,
        priority,
        timeout,
      });
    } catch (error) {
      logger.error('NotificationManager', 'Failed to show notification', {
        title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if do-not-disturb mode is active
   * Supports overnight schedules (e.g., 22:00 to 08:00)
   */
  static isDoNotDisturbActive(): boolean {
    if (!this.config.doNotDisturb.enabled) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const start =
      this.config.doNotDisturb.startTime.hour * 60 +
      this.config.doNotDisturb.startTime.minute;
    const end =
      this.config.doNotDisturb.endTime.hour * 60 +
      this.config.doNotDisturb.endTime.minute;

    // Handle overnight schedule (e.g., 22:00 to 08:00)
    if (start > end) {
      // Active if current time >= start OR current time < end
      return currentTime >= start || currentTime < end;
    } else {
      // Normal schedule (e.g., 23:00 to 07:00)
      return currentTime >= start && currentTime < end;
    }
  }

  /**
   * Send test notification
   */
  static sendTest(): void {
    this.send(
      NotificationType.SYSTEM,
      '测试通知',
      '如果您看到此通知,说明通知系统工作正常',
      NotificationPriority.NORMAL
    );
  }

  /**
   * Update notification configuration
   */
  static configure(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };

    logger.info('NotificationManager', 'Configuration updated', {
      enabled: this.config.enabled,
      doNotDisturb: this.config.doNotDisturb.enabled,
    });
  }

  /**
   * Get current configuration
   */
  static getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Reset occurrence counts (for testing)
   */
  static resetOccurrenceCounts(): void {
    this.occurrenceCount.clear();

    // Clear all timers to prevent memory leaks
    for (const timer of this.occurrenceTimers.values()) {
      clearTimeout(timer);
    }
    this.occurrenceTimers.clear();
  }
}

export default NotificationManager;
