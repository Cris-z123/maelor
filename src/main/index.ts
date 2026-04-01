import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import DatabaseManager from './database/Database.js';
import { SchemaManager } from './database/schema.js';
import { ConfigManager } from './config/ConfigManager.js';
import { logger } from './config/logger.js';
import { IPC_CHANNELS } from './ipc/channels.js';
import { SingleInstanceManager, ApplicationManager } from './app.js';
import { IPCValidatorRegistry } from './ipc/validators/registry.js';
import { registerOnboardingValidators } from './ipc/validators/onboarding.js';
import { registerSettingsValidators } from './ipc/validators/settings.js';
import { checkForUpdates, downloadAndInstallUpdate } from './app/lifecycle.js';
import { errorHandler } from './error-handler.js';
import { createOnboardingWindow } from './windows/onboardingWindow.js';
import OnboardingManager from './onboarding/OnboardingManager.js';
import PstDiscovery from './outlook/PstDiscovery.js';
import RunRepository, { MVP_CONFIG_KEYS } from './runs/RunRepository.js';

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
    // Disable CSP warning in development (Vite HMR requires unsafe-eval)
    if (process.env.NODE_ENV === 'development') {
      process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
    }

    // Initialize global error handler (T104 - per plan v2.7)
    errorHandler.initialize();
    logger.info('ErrorHandler', 'Global error handler initialized');

    // Initialize application manager and check for single-instance
    if (!ApplicationManager.initialize()) {
      // Second instance detected - quit immediately
      // (This will never return as app.quit() is called)
      throw new Error('Second instance detected - exiting');
    }

    this.setupEventHandlers();
  }

  /**
   * Setup application event handlers
   */
  private setupEventHandlers(): void {
    // App ready event
    app.whenReady().then(() => this.onReady());

    // Window all closed event
    app.on('window-all-closed', () => this.onWindowAllClosed());

    // App before quit event
    app.on('before-quit', () => this.onBeforeQuit());

    // App activation (macOS)
    app.on('activate', () => this.onActivate());
  }

  /**
   * Initialize application when ready
   */
  private async onReady(): Promise<void> {
    try {
      // Application is starting (logger auto-initializes via electron-log)
      logger.info('Application', 'Application starting up');

      // Initialize database
      DatabaseManager.initialize();
      logger.info('Database', 'Database initialized');

      // Initialize schema
      await SchemaManager.initialize();
      logger.info('Schema', 'Schema initialized');

      // Initialize config manager
      await ConfigManager.initialize();
      await ConfigManager.initializeDefaults();
      logger.info('Config', 'Configuration initialized');

      // Setup IPC handlers
      await this.setupIPCHandlers();
      logger.info('IPC', 'IPC handlers registered');

      // Check onboarding status and create appropriate window
      if (!OnboardingManager.isComplete()) {
        this.createOnboardingWindow();
        logger.info('Window', 'Onboarding window created (first launch)');
      } else {
        this.createMainWindow();
        logger.info('Window', 'Main window created (onboarding complete)');
      }

      // Check for updates (if in remote mode)
      const config = await ConfigManager.get(['llm.mode']);
      if (config['llm.mode'] === 'remote') {
        // TODO: Implement update check
        logger.info('Update', 'Auto-update check skipped (not implemented yet)');
      }

      // Mark application as ready
      ApplicationManager.setReady();
    } catch (error) {
      logger.error('Application', 'Failed to initialize application', error);
      throw error;
    }
  }

  /**
   * Create onboarding wizard window
   */
  private createOnboardingWindow(): void {
    this.onboardingWindow = createOnboardingWindow();

    // Handle onboarding window closed
    this.onboardingWindow.on('closed', () => {
      this.onboardingWindow = null;

      // If onboarding completed, create main window
      if (OnboardingManager.isComplete()) {
        this.createMainWindow();
      }
      logger.info('Window', 'Onboarding window closed');
    });
  }

  /**
   * Create main application window
   */
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
      show: false, // Don't show until ready
    });

    // Load renderer
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, '../renderer/index.html')
      );
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      logger.info('Window', 'Main window shown');
    });

    // Register window with single-instance manager
    SingleInstanceManager.setMainWindow(this.mainWindow);

    // Set main window for error handler (T104)
    errorHandler.setMainWindow(this.mainWindow);

    // Handle window closed
    this.mainWindow.on('closed', () => {
      errorHandler.setMainWindow(null);
      this.mainWindow = null;
      logger.info('Window', 'Main window closed');
    });

    // Log renderer errors (T104 - using global error handler)
    this.mainWindow.webContents.on('render-process-gone', (_event, details) => {
      errorHandler.handleRendererProcessGone(details);
    });
  }

  /**
   * Setup IPC handlers
   */
  private async setupIPCHandlers(): Promise<void> {
    // Register onboarding validators (T014 - IPC Validation System)
    const db = DatabaseManager.getDatabase();
    registerOnboardingValidators(IPCValidatorRegistry, db);
    logger.info('IPC', 'Onboarding validators registered (Zod validation enabled)');

    // Register settings validators (T014 - IPC Validation System)
    registerSettingsValidators(IPCValidatorRegistry, db);
    logger.info('IPC', 'Settings validators registered (Zod validation enabled)');

    // Register Onboarding IPC handlers
    const { handleGetStatusV2, handleSetStepV2, handleDetectEmailClientV2, handleValidateEmailPathV2, handleTestLLMConnectionV2 } = await import('./ipc/handlers/onboardingHandler.js');

    // Remove any existing handlers first (in case validators already registered them)
    ipcMain.removeHandler(IPC_CHANNELS.ONBOARDING_GET_STATUS);
    ipcMain.removeHandler(IPC_CHANNELS.ONBOARDING_SET_STEP);
    ipcMain.removeHandler(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT);
    ipcMain.removeHandler(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH);
    ipcMain.removeHandler(IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION);
    ipcMain.removeHandler(IPC_CHANNELS.ONBOARDING_COMPLETE_SETUP);

    // Now register the new handlers
    ipcMain.handle(IPC_CHANNELS.ONBOARDING_GET_STATUS, async (_event) => {
      logger.debug('IPC', 'Onboarding get-status request received');
      return await handleGetStatusV2(_event);
    });

    ipcMain.handle(IPC_CHANNELS.ONBOARDING_SET_STEP, async (_event, step) => {
      logger.debug('IPC', 'Onboarding set-step request received', { step });
      return await handleSetStepV2(_event, step);
    });

    ipcMain.handle(IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT, async (_event, type) => {
      logger.debug('IPC', 'Onboarding detect-email-client request received', { type });
      return await handleDetectEmailClientV2(_event, type);
    });

    ipcMain.handle(IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH, async (_event, path, clientType) => {
      logger.debug('IPC', 'Onboarding validate-email-path request received', { path, clientType });
      return await handleValidateEmailPathV2(_event, path, clientType);
    });

    ipcMain.handle(IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION, async (_event, config) => {
      logger.debug('IPC', 'Onboarding test-llm-connection request received');
      return await handleTestLLMConnectionV2(_event, config);
    });

    ipcMain.handle(IPC_CHANNELS.ONBOARDING_COMPLETE_SETUP, async (_event, request) => {
      logger.debug('IPC', 'Onboarding complete-setup request received');

      const validation = PstDiscovery.validateDirectory(request.directoryPath);
      if (!validation.valid) {
        return { success: false, error: validation.message };
      }

      await ConfigManager.set({
        [MVP_CONFIG_KEYS.outlookDirectory]: request.directoryPath,
        [MVP_CONFIG_KEYS.aiBaseUrl]: request.baseUrl,
        [MVP_CONFIG_KEYS.aiModel]: request.model,
        'llm.remoteEndpoint': request.baseUrl,
        'llm.apiKey': request.apiKey,
        'llm.model': request.model,
      });

      await OnboardingManager.completeSetup({
        directoryPath: request.directoryPath,
        baseUrl: request.baseUrl,
        apiKey: request.apiKey,
        model: request.model,
      });

      return { success: true };
    });

    logger.info('IPC', 'Onboarding handlers registered');

    // Note: Other handlers (generation, reports, notifications)
    // will be migrated to validator system incrementally in T018+

    // Placeholder handlers for remaining IPC channels
    // Full implementation will be in user stories

    // LLM generate
    ipcMain.handle(IPC_CHANNELS.LLM_GENERATE, async (_event, _request) => {
      logger.debug('IPC', 'LLM generate request received');
      // TODO: Implement in US1
      return { success: false, error: 'NOT_IMPLEMENTED' };
    });

    // Database query history
    ipcMain.handle(IPC_CHANNELS.DB_QUERY_HISTORY, async (_event, _request) => {
      logger.debug('IPC', 'Database query history request received');
      // TODO: Implement in US1 - query daily_reports / todo_items by reportDate
      return [];
    });

    // Database export
    ipcMain.handle(IPC_CHANNELS.DB_EXPORT, async (_event, _request) => {
      logger.debug('IPC', 'Database export request received');
      // TODO: Implement in Polish phase
      return { success: false, error: 'NOT_IMPLEMENTED' };
    });

    // Config get
    ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async (_event, request) => {
      logger.debug('IPC', 'Config get request received');
      const keys = request?.keys;
      return { config: await ConfigManager.get(keys) };
    });

    // Config set
    ipcMain.handle(IPC_CHANNELS.CONFIG_SET, async (_event, request) => {
      logger.debug('IPC', 'Config set request received');
      const updated = await ConfigManager.set(request.updates);
      return { success: true, updated };
    });

    ipcMain.handle(IPC_CHANNELS.RUNS_START, async () => {
      logger.debug('IPC', 'Runs start request received');
      const settingsSeed = await RunRepository.getSettingsSeed();
      const validation = PstDiscovery.validateDirectory(settingsSeed.outlookDirectory);

      if (!validation.valid) {
        return {
          success: false,
          runId: null,
          message: validation.message,
        };
      }

      const run = await RunRepository.createEmptyRun(
        validation.files.filter((file) => file.readability === 'readable'),
        settingsSeed.outlookDirectory
      );
      await RunRepository.saveRun(run);

      return {
        success: true,
        runId: run.runId,
        message: run.message,
      };
    });

    ipcMain.handle(IPC_CHANNELS.RUNS_GET_LATEST, async () => {
      logger.debug('IPC', 'Runs get-latest request received');
      return await RunRepository.getLatest();
    });

    ipcMain.handle(IPC_CHANNELS.RUNS_GET_BY_ID, async (_event, request) => {
      logger.debug('IPC', 'Runs get-by-id request received', request);
      return await RunRepository.getById(request.runId);
    });

    ipcMain.handle(IPC_CHANNELS.RUNS_LIST_RECENT, async (_event, request) => {
      logger.debug('IPC', 'Runs list-recent request received', request);
      return await RunRepository.listRecent(request?.limit ?? 20);
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
      logger.debug('IPC', 'Settings get-all request received');
      const seed = await RunRepository.getSettingsSeed();
      return {
        outlookDirectory: seed.outlookDirectory,
        aiBaseUrl: seed.aiBaseUrl,
        aiModel: seed.aiModel,
      };
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, request) => {
      logger.debug('IPC', 'Settings update request received', request?.section);
      await ConfigManager.set({
        ...(typeof request?.updates?.outlookDirectory === 'string'
          ? { [MVP_CONFIG_KEYS.outlookDirectory]: request.updates.outlookDirectory }
          : {}),
        ...(typeof request?.updates?.aiBaseUrl === 'string'
          ? { [MVP_CONFIG_KEYS.aiBaseUrl]: request.updates.aiBaseUrl }
          : {}),
        ...(typeof request?.updates?.aiModel === 'string'
          ? { [MVP_CONFIG_KEYS.aiModel]: request.updates.aiModel }
          : {}),
      });
      return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_DATA_SUMMARY, async () => {
      logger.debug('IPC', 'Settings get-data-summary request received');
      const seed = await RunRepository.getSettingsSeed();
      return {
        outlookDirectory: seed.outlookDirectory,
        aiBaseUrl: seed.aiBaseUrl,
        aiModel: seed.aiModel,
        databasePath: DatabaseManager.getPath(),
        databaseSizeBytes: DatabaseManager.getSize(),
      };
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_CLEAR_RUNS, async () => {
      logger.debug('IPC', 'Settings clear-runs request received');
      const deletedRunCount = await RunRepository.clearRuns();
      return { success: true, deletedRunCount };
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_REBUILD_INDEX, async () => {
      logger.debug('IPC', 'Settings rebuild-index request received');
      DatabaseManager.vacuum();
      return { success: true, message: '索引与数据库维护已完成。' };
    });

    // App check update
    ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATE, async (_event, request?: { manual?: boolean }) => {
      logger.debug('IPC', 'Update check request received');
      const manual = request?.manual ?? false;
      const result = await checkForUpdates(manual);
      return {
        success: result.success,
        hasUpdate: result.hasUpdate,
        version: result.version,
        releaseDate: result.releaseDate,
        releaseNotes: result.releaseNotes,
        error: result.error,
      };
    });

    // App download and install update
    ipcMain.handle(IPC_CHANNELS.APP_DOWNLOAD_UPDATE, async () => {
      logger.debug('IPC', 'Download update request received');
      await downloadAndInstallUpdate();
      return { success: true };
    });

    // Email fetch metadata
    ipcMain.handle(IPC_CHANNELS.EMAIL_FETCH_META, async (_event, _request) => {
      logger.debug('IPC', 'Email metadata fetch request received');
      // TODO: Implement in US4
      return { success: false, error: 'NOT_IMPLEMENTED' };
    });

    // Feedback submit
    ipcMain.handle(IPC_CHANNELS.FEEDBACK_SUBMIT, async (_event, _request) => {
      logger.debug('IPC', 'Feedback submit request received');
      // TODO: Implement in US3
      return { success: false, error: 'NOT_IMPLEMENTED' };
    });

    // Feedback stats
    ipcMain.handle(IPC_CHANNELS.FEEDBACK_STATS, async (_event) => {
      logger.debug('IPC', 'Feedback stats request received');
      // TODO: Implement in US3
      return { total: 0, byType: {} };
    });

    // Feedback destroy
    ipcMain.handle(IPC_CHANNELS.FEEDBACK_DESTROY, async (_event) => {
      logger.debug('IPC', 'Feedback destroy request received');
      // TODO: Implement in US3
      return { success: false, error: 'NOT_IMPLEMENTED' };
    });

    logger.info('IPC', 'All IPC handlers registered');
  }

  /**
   * Handle window-all-closed event
   */
  private onWindowAllClosed(): void {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  /**
   * Handle before-quit event
   */
  private onBeforeQuit(): void {
    this.isQuitting = true;
    logger.info('Application', 'Application quitting');

    // Close database connection
    DatabaseManager.close();
    logger.info('Database', 'Database connection closed');
  }

  /**
   * Handle activate event (macOS dock click)
   */
  private onActivate(): void {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      if (!OnboardingManager.isComplete()) {
        this.createOnboardingWindow();
      } else {
        this.createMainWindow();
      }
    }
  }

  /**
   * Check if application is quitting
   */
  public isAppQuitting(): boolean {
    return this.isQuitting;
  }
}

// Initialize application
new Application();

export default Application;
