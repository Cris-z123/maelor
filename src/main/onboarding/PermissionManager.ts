/**
 * PermissionManager
 *
 * Handles file system and notification permissions with graceful fallback.
 * Per design doc Section 5, T031
 */

import { dialog, Notification } from 'electron';
import { logger } from '../config/logger.js';

interface FileSystemAccessResult {
  granted: boolean;
  restrictedMode: boolean;
}

type PermissionStatus = 'granted' | 'denied' | 'prompt';

interface PermissionCheckResult {
  fileSystem: PermissionStatus;
  notifications: PermissionStatus;
}

class PermissionManager {
  /**
   * Request file system access
   * Shows open dialog and returns result
   */
  static async requestFileSystemAccess(): Promise<FileSystemAccessResult> {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择邮件客户端目录',
        properties: ['openDirectory'],
        message: '请选择您的邮件客户端数据目录',
      });

      if (result.canceled || result.filePaths.length === 0) {
        logger.info('PermissionManager', 'File system access denied by user');

        return {
          granted: false,
          restrictedMode: true,
        };
      }

      logger.info('PermissionManager', 'File system access granted', {
        path: result.filePaths[0],
      });

      return {
        granted: true,
        restrictedMode: false,
      };
    } catch (error) {
      logger.error('PermissionManager', 'Failed to request file system access', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        granted: false,
        restrictedMode: true,
      };
    }
  }

  /**
   * Request notification permission
   */
  static async requestNotificationPermission(): Promise<boolean> {
    try {
      if (!Notification.isSupported()) {
        logger.warn('PermissionManager', 'Notifications not supported on this system');
        return false;
      }

      // Electron Notification doesn't have a permission property
      // Notifications are either supported or not
      return true;
    } catch (error) {
      logger.error('PermissionManager', 'Failed to request notification permission', {
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Check current permission status
   */
  static async checkPermissions(): Promise<PermissionCheckResult> {
    const fileSystem: PermissionStatus = 'granted';
    const notifications: PermissionStatus = Notification.isSupported()
      ? 'granted'
      : 'denied';

    return {
      fileSystem,
      notifications,
    };
  }
}

export { PermissionManager };
export default PermissionManager;
