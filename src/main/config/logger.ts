/**
 * electron-log v5 Configuration
 *
 * Structured logging for mailCopilot application
 * Features:
 * - Structured JSON output (error type, module, message, timestamp, context)
 * - Log levels: DEBUG, INFO, WARN, ERROR
 * - File and console output with automatic log rotation
 * - Cross-platform path handling
 */

import log from 'electron-log';
import { app } from 'electron';
import path from 'path';

/**
 * TypeScript interfaces for electron-log transports
 * These extend the base electron-log types with missing properties
 */
interface LogTransport {
  level?: string;
  format?: string;
  maxSize?: number;
  file?: string;
}

/**
 * Check if running in test environment
 */
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/**
 * Initialize electron-log transports
 */
function initializeLogger(): void {
  // Skip file transport initialization in test environment
  if (isTestEnvironment()) {
    // Configure console transport only for tests
    const consoleTransport = log.transports.console as LogTransport;
    consoleTransport.level = 'debug';
    return;
  }

  // Ensure logs directory exists
  const logsDir = path.join(app.getPath('userData'), '.mailcopilot', 'logs');

  // Configure file transport
  const fileTransport = log.transports.file as LogTransport;
  fileTransport.level = 'debug';
  fileTransport.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{processType}] {text}';
  fileTransport.maxSize = 10 * 1024 * 1024; // 10MB per file
  fileTransport.file = path.join(logsDir, 'main.log');

  // Configure console transport for development
  const consoleTransport = log.transports.console as LogTransport;
  if (process.env.NODE_ENV === 'development') {
    consoleTransport.level = 'debug';
  } else {
    consoleTransport.level = 'info';
  }
}

// Initialize logger on module load
initializeLogger();

/**
 * Structured logging helper
 * Provides consistent logging interface across the application
 */

type LogContext = Record<string, unknown>;

type ErrorData = {
  error?: {
    message: string;
    stack?: string;
    name: string;
  } | string;
};

export const logger = {
  /**
   * Log debug message
   * @param module - Module name (e.g., 'LLMAdapter', 'Database')
   * @param message - Log message
   * @param context - Additional context metadata
   */
  debug: (module: string, message: string, context?: LogContext) => {
    log.debug({
      level: 'DEBUG',
      module,
      message,
      timestamp: Date.now(),
      ...context,
    });
  },

  /**
   * Log info message
   * @param module - Module name
   * @param message - Log message
   * @param context - Additional context metadata
   */
  info: (module: string, message: string, context?: LogContext) => {
    log.info({
      level: 'INFO',
      module,
      message,
      timestamp: Date.now(),
      ...context,
    });
  },

  /**
   * Log warning message
   * @param module - Module name
   * @param message - Log message
   * @param context - Additional context metadata
   */
  warn: (module: string, message: string, context?: LogContext) => {
    log.warn({
      level: 'WARN',
      module,
      message,
      timestamp: Date.now(),
      ...context,
    });
  },

  /**
   * Log error message
   * @param module - Module name
   * @param message - Log message
   * @param error - Error object (optional)
   * @param context - Additional context metadata
   */
  error: (
    module: string,
    message: string,
    error?: Error | unknown,
    context?: LogContext
  ) => {
    const errorData: ErrorData = {};

    if (error instanceof Error) {
      errorData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorData.error = String(error);
    }

    log.error({
      level: 'ERROR',
      module,
      message,
      timestamp: Date.now(),
      ...errorData,
      ...context,
    });
  },
};

/**
 * Set context ID for request tracing (optional enhancement)
 * @param contextId - Unique identifier for request/context
 */
export function setContextId(contextId: string): void {
  const fileTransport = log.transports.file as LogTransport;
  fileTransport.format = `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [${contextId}] [{processType}] {text}`;
}

/**
 * Clear context ID
 */
export function clearContextId(): void {
  const fileTransport = log.transports.file as LogTransport;
  fileTransport.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{processType}] {text}';
}

export default log;
