import { app, BrowserWindow, dialog } from 'electron';

import { logger } from './config/logger.js';
import { SchemaMigrationError } from './database/schema.js';

export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  DATABASE = 'database',
  LLM_SERVICE = 'llm_service',
  EMAIL_PARSING = 'email_parsing',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  FILESYSTEM = 'filesystem',
  RENDERER = 'renderer',
  UNKNOWN = 'unknown',
}

export interface ErrorInfo {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  module: string;
  error: Error;
  context?: Record<string, unknown>;
  timestamp: number;
}

const USER_FRIENDLY_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.DATABASE]: '数据库出现错误，部分功能暂时不可用。',
  [ErrorCategory.LLM_SERVICE]: 'AI 服务连接失败，请检查网络、地址和 API 配置。',
  [ErrorCategory.EMAIL_PARSING]: '邮件解析失败，请检查 PST 文件是否完整且可读。',
  [ErrorCategory.NETWORK]: '网络连接异常，请检查当前网络环境。',
  [ErrorCategory.CONFIGURATION]: '应用配置不可用，请重新检查或恢复配置。',
  [ErrorCategory.FILESYSTEM]: '文件访问失败，请检查目录权限和文件状态。',
  [ErrorCategory.RENDERER]: '界面进程异常退出，请重启应用后重试。',
  [ErrorCategory.UNKNOWN]: '发生未知错误，请重启应用后重试。',
};

class GlobalErrorHandler {
  private mainWindow: BrowserWindow | null = null;
  private errorCount = 0;
  private readonly MAX_ERRORS_BEFORE_EXIT = 10;
  private errorTimestamps: number[] = [];

  initialize(): void {
    process.on('uncaughtException', (error: Error) => this.handleUncaughtException(error));
    process.on('unhandledRejection', (reason: unknown) => this.handleUnhandledRejection(reason));
    logger.info('ErrorHandler', 'Global error handlers registered');
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  private handleUncaughtException(error: Error): void {
    const category = this.categorizeError(error);
    const errorInfo: ErrorInfo = {
      category,
      severity: ErrorSeverity.CRITICAL,
      userMessage: USER_FRIENDLY_MESSAGES[category],
      technicalMessage: error.message || 'Unknown error',
      module: 'MainProcess',
      error,
      timestamp: Date.now(),
    };

    logger.error('ErrorHandler', 'Uncaught exception', error, {
      category: errorInfo.category,
      severity: errorInfo.severity,
      module: errorInfo.module,
    });

    this.trackError();
    this.showErrorDialog(errorInfo);

    if (this.errorCount >= this.MAX_ERRORS_BEFORE_EXIT) {
      logger.error('ErrorHandler', 'Too many errors, exiting application');
      app.exit(1);
    }
  }

  private handleUnhandledRejection(reason: unknown): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const category = this.categorizeError(error);
    const errorInfo: ErrorInfo = {
      category,
      severity: ErrorSeverity.ERROR,
      userMessage: USER_FRIENDLY_MESSAGES[category],
      technicalMessage: error.message || 'Unhandled promise rejection',
      module: 'MainProcess',
      error,
      timestamp: Date.now(),
    };

    logger.error('ErrorHandler', 'Unhandled promise rejection', error, {
      category: errorInfo.category,
      severity: errorInfo.severity,
      module: errorInfo.module,
    });

    this.trackError();
  }

  handleRendererProcessGone(details: Electron.RenderProcessGoneDetails): void {
    const errorInfo: ErrorInfo = {
      category: ErrorCategory.RENDERER,
      severity: ErrorSeverity.CRITICAL,
      userMessage: USER_FRIENDLY_MESSAGES[ErrorCategory.RENDERER],
      technicalMessage: `Renderer process gone: ${details.reason}`,
      module: 'RendererProcess',
      error: new Error(details.reason),
      context: {
        reason: details.reason,
        exitCode: details.exitCode,
      },
      timestamp: Date.now(),
    };

    logger.error('ErrorHandler', 'Renderer process gone', errorInfo.error, {
      category: errorInfo.category,
      severity: errorInfo.severity,
      reason: details.reason,
      exitCode: details.exitCode,
    });

    this.trackError();
    this.showErrorDialog(errorInfo);
  }

  showFatalStartupDialog(error: unknown): void {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return;
    }

    const startupError = error instanceof Error ? error : new Error(String(error));
    dialog.showErrorBox('mailCopilot 启动失败', this.buildStartupFailureMessage(startupError));
  }

  private showErrorDialog(errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return;
    }

    if (!this.mainWindow && !app.isReady()) {
      return;
    }

    const message = `${errorInfo.userMessage}\n\n如果问题持续存在，请重启应用后重试。`;
    dialog.showErrorBox('mailCopilot 错误', message);
  }

  private buildStartupFailureMessage(error: Error): string {
    if (error instanceof SchemaMigrationError) {
      const backupHint = error.backupPath ? `\n数据库备份位置：${error.backupPath}` : '';
      return [
        '应用无法完成本地数据库升级，已停止启动以保护现有数据。',
        '',
        '建议操作：',
        '1. 先不要手动删除数据库文件。',
        '2. 记录错误信息并联系维护人员。',
        '3. 如需恢复，请优先使用自动生成的数据库备份。',
        '',
        `详细信息：${error.message}${backupHint}`,
      ].join('\n');
    }

    if (error.message === 'CONFIG_KEY_ACCESS_FAILED') {
      return [
        '应用无法读取当前设备上的加密配置，已停止启动。',
        '',
        '建议操作：',
        '1. 确认当前 Windows 用户与原始安装时一致。',
        '2. 检查系统安全存储是否可用。',
        '3. 如设备环境已变更，请在确认后重新配置应用。',
      ].join('\n');
    }

    const category = this.categorizeError(error);
    return [
      '应用启动过程中发生错误，已安全退出以避免留下后台进程或损坏本地数据。',
      '',
      `原因：${USER_FRIENDLY_MESSAGES[category]}`,
      '',
      '建议操作：',
      '1. 重新启动应用。',
      '2. 如果问题持续存在，请检查安装目录、数据目录和日志文件。',
      `3. 技术信息：${error.message}`,
    ].join('\n');
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (
      error instanceof SchemaMigrationError ||
      message.includes('database') ||
      message.includes('sqlite') ||
      message.includes('schema') ||
      stack.includes('database')
    ) {
      return ErrorCategory.DATABASE;
    }

    if (
      message.includes('llm') ||
      message.includes('ollama') ||
      message.includes('openai') ||
      message.includes('ai service')
    ) {
      return ErrorCategory.LLM_SERVICE;
    }

    if (
      message.includes('email') ||
      message.includes('parse') ||
      message.includes('eml') ||
      message.includes('msg') ||
      message.includes('pst')
    ) {
      return ErrorCategory.EMAIL_PARSING;
    }

    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('timeout')
    ) {
      return ErrorCategory.NETWORK;
    }

    if (
      message.includes('enoent') ||
      message.includes('eacces') ||
      message.includes('permission') ||
      message.includes('file') ||
      message.includes('directory')
    ) {
      return ErrorCategory.FILESYSTEM;
    }

    if (
      message.includes('config') ||
      message.includes('setting') ||
      message.includes('preference') ||
      message.includes('safe storage') ||
      message.includes('safestorage')
    ) {
      return ErrorCategory.CONFIGURATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  private trackError(): void {
    this.errorCount++;
    const now = Date.now();
    this.errorTimestamps.push(now);
    this.errorTimestamps = this.errorTimestamps.filter((timestamp) => now - timestamp < 60000);

    if (this.errorTimestamps.length > 5) {
      logger.warn('ErrorHandler', 'High error rate detected', {
        errorCount: this.errorCount,
        recentErrors: this.errorTimestamps.length,
      });
    }
  }

  reportError(error: Error, category: ErrorCategory, module: string, context?: Record<string, unknown>): void {
    const errorInfo: ErrorInfo = {
      category,
      severity: this.determineSeverity(error, category),
      userMessage: USER_FRIENDLY_MESSAGES[category],
      technicalMessage: error.message,
      module,
      error,
      context,
      timestamp: Date.now(),
    };

    logger.error(module, errorInfo.technicalMessage, error, {
      category: errorInfo.category,
      severity: errorInfo.severity,
      ...context,
    });

    this.trackError();

    if (errorInfo.severity === ErrorSeverity.CRITICAL) {
      this.showErrorDialog(errorInfo);
    }
  }

  private determineSeverity(_error: Error, category: ErrorCategory): ErrorSeverity {
    if (category === ErrorCategory.RENDERER || category === ErrorCategory.DATABASE) {
      return ErrorSeverity.CRITICAL;
    }

    if (category === ErrorCategory.NETWORK || category === ErrorCategory.LLM_SERVICE) {
      return ErrorSeverity.WARNING;
    }

    return ErrorSeverity.ERROR;
  }

  getErrorStats(): { totalErrors: number; recentErrors: number } {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorTimestamps.length,
    };
  }

  resetErrorTracking(): void {
    this.errorCount = 0;
    this.errorTimestamps = [];
    logger.info('ErrorHandler', 'Error tracking reset');
  }
}

export const errorHandler = new GlobalErrorHandler();

export default errorHandler;
