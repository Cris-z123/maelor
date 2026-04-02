import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { SingleInstanceManager, ApplicationManager } from './app.js';
import { ConfigManager } from './config/ConfigManager.js';
import { logger } from './config/logger.js';
import DatabaseManager from './database/Database.js';
import { SchemaManager } from './database/schema.js';
import { errorHandler } from './error-handler.js';
import { registerAppIpcHandlers } from './ipc/registerAppHandlers.js';
import OnboardingManager from './onboarding/OnboardingManager.js';
import { createOnboardingWindow } from './windows/onboardingWindow.js';

/**
 * Main Process Entry Point
 *
 * Responsibilities:
 * - Application initialization
 * - Window creation and management
 * - IPC handler registration
 * - Lifecycle management (ready, quit, window-all-closed)
 */

class Application {
  private mainWindow: BrowserWindow | null = null;
  private onboardingWindow: BrowserWindow | null = null;
  private isQuitting = false;

  constructor() {
    if (process.env.NODE_ENV === 'development') {
      process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
    }

    errorHandler.initialize();
    logger.info('ErrorHandler', 'Global error handler initialized');

    if (!ApplicationManager.initialize()) {
      throw new Error('Second instance detected - exiting');
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    app.whenReady().then(() => this.onReady());
    app.on('window-all-closed', () => this.onWindowAllClosed());
    app.on('before-quit', () => this.onBeforeQuit());
    app.on('activate', () => this.onActivate());
  }

  private async onReady(): Promise<void> {
    try {
      logger.info('Application', 'Application starting up');

      DatabaseManager.initialize();
      logger.info('Database', 'Database initialized');

      await SchemaManager.initialize();
      logger.info('Schema', 'Schema initialized');

      await ConfigManager.initialize();
      await ConfigManager.initializeDefaults();
      logger.info('Config', 'Configuration initialized');

      await this.setupIPCHandlers();
      logger.info('IPC', 'IPC handlers registered');

      if (!OnboardingManager.isComplete()) {
        this.createOnboardingWindow();
        logger.info('Window', 'Onboarding window created (first launch)');
      } else {
        this.createMainWindow();
        logger.info('Window', 'Main window created (onboarding complete)');
      }

      ApplicationManager.setReady();
    } catch (error) {
      logger.error('Application', 'Failed to initialize application', error);
      throw error;
    }
  }

  private createOnboardingWindow(): void {
    this.onboardingWindow = createOnboardingWindow();

    this.onboardingWindow.on('closed', () => {
      this.onboardingWindow = null;

      if (OnboardingManager.isComplete()) {
        this.createMainWindow();
      }
      logger.info('Window', 'Onboarding window closed');
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, '../../electron/preload.js'),
      },
      show: false,
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      logger.info('Window', 'Main window shown');
    });

    SingleInstanceManager.setMainWindow(this.mainWindow);
    errorHandler.setMainWindow(this.mainWindow);

    this.mainWindow.on('closed', () => {
      errorHandler.setMainWindow(null);
      this.mainWindow = null;
      logger.info('Window', 'Main window closed');
    });

    this.mainWindow.webContents.on('render-process-gone', (_event, details) => {
      errorHandler.handleRendererProcessGone(details);
    });
  }

  private async setupIPCHandlers(): Promise<void> {
    await registerAppIpcHandlers();
    logger.info('IPC', 'Active onboarding, runs, and settings handlers registered');
  }

  private onWindowAllClosed(): void {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onBeforeQuit(): void {
    this.isQuitting = true;
    logger.info('Application', 'Application quitting');

    DatabaseManager.close();
    logger.info('Database', 'Database connection closed');
  }

  private onActivate(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (!OnboardingManager.isComplete()) {
        this.createOnboardingWindow();
      } else {
        this.createMainWindow();
      }
    }
  }

  public isAppQuitting(): boolean {
    return this.isQuitting;
  }
}

new Application();

export default Application;
