import { app, BrowserWindow } from 'electron';
import { logger } from './config/logger.js';

/**
 * Single-Instance Lock Manager
 *
 * Enforces single-instance execution per Constitution Principle VI:
 * - Only one instance of the application can run at a time
 * - Second instance attempts focus the existing window
 *
 * This prevents SQLite database corruption from concurrent access
 * and provides a better user experience.
 */
export class SingleInstanceManager {
  private static hasLock = false;
  private static mainWindow: BrowserWindow | null = null;

  /**
   * Request single-instance lock
   *
   * @returns true if lock was acquired (first instance), false if another instance is running
   */
  static acquireLock(): boolean {
    this.hasLock = app.requestSingleInstanceLock();

    if (!this.hasLock) {
      logger.warn('SingleInstance', 'Second instance detected - quitting');
      return false;
    }

    app.on('second-instance', (_event, commandLine, workingDirectory) => {
      this.onSecondInstance(_event, commandLine, workingDirectory);
    });

    logger.info('SingleInstance', 'Single-instance lock acquired');
    return true;
  }

  /**
   * Set the main window for focus handling
   *
   * @param window - The main application window
   */
  static setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    logger.debug('SingleInstance', 'Main window registered');
  }

  /**
   * Handle second-instance launch attempt
   *
   * @param _event - Second instance event (unused)
   * @param commandLine - Command line arguments from second instance
   * @param workingDirectory - Working directory from second instance
   */
  private static onSecondInstance(_event: Electron.Event, commandLine: string[], workingDirectory: string): void {
    logger.info('SingleInstance', 'Second instance launch detected', {
      commandLine,
      workingDirectory,
    });

    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
        logger.debug('SingleInstance', 'Window restored from minimized state');
      }

      this.mainWindow.focus();
      logger.debug('SingleInstance', 'Window focused');
    } else {
      logger.warn('SingleInstance', 'Second instance detected but no main window available');
    }
  }

  /**
   * Release the single-instance lock (called on quit)
   */
  static releaseLock(): void {
    if (this.hasLock) {
      app.releaseSingleInstanceLock();
      this.hasLock = false;
      logger.info('SingleInstance', 'Single-instance lock released');
    }
  }

  /**
   * Check if we hold the single-instance lock
   */
  static isMainInstance(): boolean {
    return this.hasLock;
  }
}

/**
 * Application Lifecycle Manager
 *
 * Handles high-level application lifecycle:
 * - Single-instance enforcement
 * - Ready state management
 * - Quit handling
 */
export class ApplicationManager {
  private static isReady = false;

  /**
   * Initialize application
   *
   * @returns true if initialization succeeded, false if second instance
   */
  static initialize(): boolean {
    if (!SingleInstanceManager.acquireLock()) {
      app.quit();
      return false;
    }

    app.on('before-quit', () => {
      this.onBeforeQuit();
    });

    app.on('will-quit', (event) => {
      this.onWillQuit(event);
    });

    logger.info('Application', 'Application manager initialized');
    return true;
  }

  /**
   * Mark application as ready
   */
  static setReady(): void {
    this.isReady = true;
    logger.info('Application', 'Application is ready');
  }

  /**
   * Check if application is ready
   */
  static isAppReady(): boolean {
    return this.isReady;
  }

  /**
   * Handle before-quit event
   */
  private static onBeforeQuit(): void {
    logger.info('Application', 'Application is about to quit');
  }

  /**
   * Handle will-quit event
   */
  private static onWillQuit(_event: Electron.Event): void {
    SingleInstanceManager.releaseLock();
  }

  /**
   * Quit the application
   */
  static quit(): void {
    logger.info('Application', 'Application quit requested');
    app.quit();
  }
}

export default { SingleInstanceManager, ApplicationManager };