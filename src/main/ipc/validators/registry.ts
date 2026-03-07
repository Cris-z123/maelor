/**
 * IPC Validator Registry
 *
 * Central registration system for validated IPC handlers.
 * Wraps all handlers with automatic Zod validation.
 *
 * Features:
 * - Strict request validation (rejects invalid data)
 * - Response validation (dev: throws, prod: logs)
 * - Context-aware error messages (dev: detailed, prod: generic)
 * - Comprehensive logging of all validation failures
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { logger } from '../../config/logger.js';

// ==================== TYPES ====================

/**
 * Validated handler contract
 * @template TRequest - Request type (inferred from requestSchema)
 * @template TResponse - Response type (inferred from responseSchema)
 */
export interface ValidatedHandler<TRequest, TResponse> {
  requestSchema: z.ZodSchema<TRequest>;
  responseSchema: z.ZodSchema<TResponse>;
  handler: (request: TRequest) => Promise<TResponse>;
}

/**
 * Validation error shape (development mode)
 */
interface ValidationErrorDetails {
  success: false;
  error: string;
  field?: string;
  issues?: z.ZodIssue[];
}

/**
 * Generic error shape (production mode)
 */
interface GenericError {
  success: false;
  error: string;
}

// ==================== REGISTRY CLASS ====================

/**
 * IPC Validator Registry
 *
 * Registers IPC handlers with automatic validation wrapper.
 * Enforces strict validation and provides context-aware error messages.
 */
export class IPCValidatorRegistry {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Register a validated IPC handler
   *
   * Wraps the handler with automatic request/response validation.
   *
   * @param channel - IPC channel name (from IPC_CHANNELS)
   * @param validatedHandler - Handler with request/response schemas
   */
  static register<TRequest, TResponse>(
    channel: string,
    validatedHandler: ValidatedHandler<TRequest, TResponse>
  ): void {
    const wrappedHandler = this.wrapHandler(channel, validatedHandler);

    ipcMain.handle(channel, wrappedHandler);

    logger.info('IPCRegistry', `Registered validated handler`, { channel });
  }

  /**
   * Wrap handler with validation logic
   *
   * Flow:
   * 1. Validate request with requestSchema
   * 2. If invalid, throw structured error
   * 3. If valid, call handler
   * 4. Validate response with responseSchema
   * 5. If invalid, log error (dev: throw, prod: continue)
   * 6. Return response
   */
  private static wrapHandler<TRequest, TResponse>(
    channel: string,
    validatedHandler: ValidatedHandler<TRequest, TResponse>
  ): (event: IpcMainInvokeEvent, request: unknown) => Promise<TResponse> {
    return async (_event, request) => {
      // Validate request
      const requestValidation =
        validatedHandler.requestSchema.safeParse(request);

      if (!requestValidation.success) {
        logger.warn('IPCRegistry', `Request validation failed`, {
          channel,
          issues: requestValidation.error.issues,
        });

        throw this.createValidationError(requestValidation.error);
      }

      // Call handler
      const response = await validatedHandler.handler(requestValidation.data);

      // Validate response (dev: strict, prod: lenient)
      const responseValidation =
        validatedHandler.responseSchema.safeParse(response);

      if (!responseValidation.success) {
        logger.error('IPCRegistry', `Response validation failed`, {
          channel,
          issues: responseValidation.error.issues,
          response,
        });

        if (this.isDevelopment) {
          throw new Error(
            `Response validation failed: ${JSON.stringify(
              responseValidation.error.issues
            )}`
          );
        }
      }

      return response;
    };
  }

  /**
   * Create structured validation error
   *
   * Development mode: Detailed error with field path and Zod issues
   * Production mode: Generic error message (no internal structure exposed)
   */
  private static createValidationError(
    error: z.ZodError
  ): ValidationErrorDetails | GenericError {
    if (this.isDevelopment) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Validation failed',
        field: error.issues[0]?.path.join('.'),
        issues: error.issues,
      };
    }

    return {
      success: false,
      error: 'Invalid request data',
    };
  }
}
