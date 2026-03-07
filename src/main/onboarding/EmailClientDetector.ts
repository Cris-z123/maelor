/**
 * EmailClientDetector
 *
 * Auto-detects email client installation paths across platforms.
 * Supports Thunderbird, Outlook, Apple Mail on Windows/macOS/Linux.
 *
 * Per plan.md T012, research.md decision #1
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { logger } from '../config/logger.js';

/**
 * Supported email clients
 */
export type EmailClientType = 'thunderbird' | 'outlook' | 'apple-mail';

/**
 * Detection result
 */
export interface DetectionResult {
  client: EmailClientType;
  path: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  emailFileCount?: number;
}

/**
 * Email Client Detector
 *
 * Features:
 * - Platform-specific default paths
 * - Auto-detection with confidence levels
 * - Path validation for email files
 * - Support for Windows, macOS, Linux
 */
class EmailClientDetector {
  /**
   * Platform detection
   */
  private static readonly platform = process.platform;

  /**
   * Default email client paths by platform
   */
  private static readonly DEFAULT_PATHS: Record<
    string,
    Record<EmailClientType, string[]>
  > = {
    win32: {
      thunderbird: [
        path.join(
          app.getPath('appData'),
          'Thunderbird',
          'Profiles'
        ),
        // Fallback: Program Files
        'C:\\Program Files\\Mozilla Thunderbird',
        'C:\\Program Files (x86)\\Mozilla Thunderbird',
      ],
      outlook: [
        // Outlook data files are typically in AppData
        path.join(app.getPath('appData'), 'Microsoft', 'Outlook'),
        path.join(
          app.getPath('home'),
          'AppData',
          'Local',
          'Microsoft',
          'Outlook'
        ),
      ],
      'apple-mail': [], // Not supported on Windows
    },
    darwin: {
      thunderbird: [
        path.join(
          app.getPath('home'),
          'Library',
          'Thunderbird',
          'Profiles'
        ),
        path.join(
          app.getPath('home'),
          'Library',
          'Application Support',
          'Thunderbird'
        ),
      ],
      outlook: [
        path.join(
          app.getPath('home'),
          'Library',
          'Group Containers',
          'UBF8T346G9.Office',
          'Outlook'
        ),
      ],
      'apple-mail': [
        path.join(app.getPath('home'), 'Library', 'Mail', 'V8'),
        path.join(app.getPath('home'), 'Library', 'Mail'),
      ],
    },
    linux: {
      thunderbird: [
        path.join(app.getPath('home'), '.thunderbird'),
        path.join(app.getPath('home'), '.mozilla', 'thunderbird'),
      ],
      outlook: [], // Outlook not supported on Linux
      'apple-mail': [], // Apple Mail not supported on Linux
    },
  };

  /**
   * Email file extensions by client
   */
  private static readonly EMAIL_EXTENSIONS: Record<EmailClientType, string[]> =
    {
      thunderbird: ['.msf', '.mbx', '.mbox'],
      outlook: ['.pst', '.ost', '.msg'],
      'apple-mail': ['.emlx', '.mbox'],
    };

  /**
   * Auto-detect email client for given type
   * Returns detected path with confidence level
   */
  static detect(client: EmailClientType): DetectionResult | null {
    const platformPaths = this.DEFAULT_PATHS[this.platform];

    if (!platformPaths) {
      logger.warn('EmailClientDetector', 'Unsupported platform', {
        platform: this.platform,
      });
      return null;
    }

    const paths = platformPaths[client];

    if (paths.length === 0) {
      logger.info('EmailClientDetector', 'Client not supported on platform', {
        client,
        platform: this.platform,
      });
      return null;
    }

    // Try each path
    for (const detectedPath of paths) {
      const result = this.checkPath(client, detectedPath);
      if (result) {
        return result;
      }
    }

    logger.info('EmailClientDetector', 'No valid path found', { client });
    return null;
  }

  /**
   * Detect all supported email clients
   * Returns array of detection results
   */
  static detectAll(): DetectionResult[] {
    const results: DetectionResult[] = [];
    const clients: EmailClientType[] = ['thunderbird', 'outlook', 'apple-mail'];

    for (const client of clients) {
      const result = this.detect(client);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Check if path exists and is valid for client
   */
  private static checkPath(
    client: EmailClientType,
    checkPath: string
  ): DetectionResult | null {
    try {
      if (!fs.existsSync(checkPath)) {
        return null;
      }

      const stat = fs.statSync(checkPath);
      if (!stat.isDirectory()) {
        return null;
      }

      // Check for email files
      const files = fs.readdirSync(checkPath);
      const emailFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return this.EMAIL_EXTENSIONS[client].includes(ext);
      });

      // Check for subdirectories with email files (Thunderbird profiles)
      let subdirectoryCount = 0;
      for (const file of files) {
        const fullPath = path.join(checkPath, file);
        try {
          const subStat = fs.statSync(fullPath);
          if (subStat.isDirectory()) {
            const subFiles = fs.readdirSync(fullPath);
            const hasEmailFiles = subFiles.some((f) => {
              const ext = path.extname(f).toLowerCase();
              return this.EMAIL_EXTENSIONS[client].includes(ext);
            });
            if (hasEmailFiles) {
              subdirectoryCount++;
            }
          }
        } catch {
          // Skip inaccessible directories
        }
      }

      // Determine confidence
      if (emailFiles.length > 0) {
        return {
          client,
          path: checkPath,
          confidence: 'high',
          reason: `Found ${emailFiles.length} email file(s)`,
        };
      }

      if (subdirectoryCount > 0) {
        return {
          client,
          path: checkPath,
          confidence: 'medium',
          reason: `Found ${subdirectoryCount} profile subdirector(y/ies)`,
        };
      }

      // Path exists but no email files found
      return {
        client,
        path: checkPath,
        confidence: 'low',
        reason: 'Directory exists but no email files found',
      };
    } catch (error) {
      logger.warn('EmailClientDetector', 'Path check failed', {
        path: checkPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Validate email client path
   * Checks if path contains valid email files
   */
  static validatePath(
    client: EmailClientType,
    userPath: string
  ): ValidationResult {
    try {
      if (!fs.existsSync(userPath)) {
        return {
          valid: false,
          error: '路径无效或未找到邮件文件',
        };
      }

      const stat = fs.statSync(userPath);
      if (!stat.isDirectory()) {
        return {
          valid: false,
          error: '路径无效或未找到邮件文件',
        };
      }

      // Recursively count email files
      const emailFileCount = this.countEmailFiles(client, userPath);

      if (emailFileCount === 0) {
        return {
          valid: false,
          error: '路径无效或未找到邮件文件',
          emailFileCount: 0,
        };
      }

      logger.info('EmailClientDetector', 'Path validation successful', {
        client,
        path: userPath,
        emailFileCount,
      });

      return {
        valid: true,
        emailFileCount,
      };
    } catch (error) {
      logger.error('EmailClientDetector', 'Path validation failed', {
        path: userPath,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        valid: false,
        error: '路径无效或未找到邮件文件',
      };
    }
  }

  /**
   * Recursively count email files in directory
   */
  private static countEmailFiles(
    client: EmailClientType,
    dirPath: string,
    depth = 0,
    maxDepth = 5
  ): number {
    if (depth > maxDepth) {
      return 0;
    }

    try {
      const files = fs.readdirSync(dirPath);
      let count = 0;

      for (const file of files) {
        const fullPath = path.join(dirPath, file);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            // Recursively count in subdirectories
            count += this.countEmailFiles(client, fullPath, depth + 1, maxDepth);
          } else if (stat.isFile()) {
            // Check if file has email extension
            const ext = path.extname(file).toLowerCase();
            if (this.EMAIL_EXTENSIONS[client].includes(ext)) {
              count++;
            }
          }
        } catch {
          // Skip inaccessible files
        }
      }

      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Get platform name
   */
  static getPlatform(): string {
    return this.platform;
  }

  /**
   * Check if client is supported on current platform
   */
  static isClientSupported(client: EmailClientType): boolean {
    const platformPaths = this.DEFAULT_PATHS[this.platform];
    return platformPaths && platformPaths[client].length > 0;
  }

  /**
   * Get supported clients for current platform
   */
  static getSupportedClients(): EmailClientType[] {
    const allClients: EmailClientType[] = [
      'thunderbird',
      'outlook',
      'apple-mail',
    ];
    return allClients.filter((client) => this.isClientSupported(client));
  }
}

export default EmailClientDetector;
