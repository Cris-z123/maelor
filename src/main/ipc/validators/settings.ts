/**
 * Settings Domain Validators
 *
 * Validates settings-related IPC channels (4 channels):
 * - settings:get-all
 * - settings:update
 * - settings:cleanup-data
 * - settings:destroy-feedback
 */

import { z } from 'zod';
import { IPCValidatorRegistry } from './registry.js';
import { IPC_CHANNELS } from '../channels.js';
import * as handlers from '../handlers/settingsHandler.js';
import type { Database } from 'better-sqlite3';

// Import common schemas
import {
  ScheduleConfigSchema,
  LocalLLMConfigSchema,
  RemoteLLMConfigSchema,
} from './common.js';

// ==================== CHANNEL 1: GET ALL SETTINGS ====================

export const SettingsGetAllRequestSchema = z.object({}).strict();

export const SettingsGetAllResponseSchema = z.object({
  email: z.object({
    clientType: z.enum(['thunderbird', 'outlook', 'apple-mail']),
    path: z.string(),
    detectedPath: z.string().nullable(),
    isValid: z.boolean(),
    validationMessage: z.string().nullable(),
  }),
  schedule: z.object({
    generationTime: z.object({
      hour: z.number().int(),
      minute: z.number().int(),
    }),
    skipWeekends: z.boolean(),
  }),
  llm: z.object({
    mode: z.enum(['local', 'remote']),
    localEndpoint: z.string(),
    remoteEndpoint: z.string(),
    apiKey: z.string(),
    connectionStatus: z.enum(['idle', 'testing', 'success', 'failed']),
    connectionMessage: z.string().nullable(),
  }),
  display: z.object({
    aiExplanationMode: z.boolean(),
  }),
  notifications: z.object({
    enabled: z.boolean(),
    doNotDisturb: z.object({
      enabled: z.boolean(),
      startTime: z.string(), // HH:mm format
      endTime: z.string(),
    }),
    sound: z.boolean(),
  }),
  data: z.object({
    totalSize: z.number(),
    feedbackStats: z.object({
      total: z.number(),
      accurate: z.number(),
      errors: z.number(),
      thisMonthCorrections: z.number(),
    }),
  }),
});

// ==================== CHANNEL 2: UPDATE SETTINGS ====================

export const SettingsUpdateRequestSchema = z.object({
  section: z.enum(['email', 'schedule', 'llm', 'display', 'notifications', 'data']),
  updates: z.object({
    email: z
      .object({
        clientType: z.enum(['thunderbird', 'outlook', 'apple-mail']).optional(),
        path: z.string().optional(),
      })
      .optional(),
    schedule: ScheduleConfigSchema.optional(),
    llm: z
      .union([
        LocalLLMConfigSchema.partial(),
        RemoteLLMConfigSchema.partial(),
      ])
      .optional(),
    display: z
      .object({
        aiExplanationMode: z.boolean().optional(),
      })
      .optional(),
    notifications: z
      .object({
        enabled: z.boolean().optional(),
        doNotDisturb: z
          .object({
            enabled: z.boolean().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
          })
          .optional(),
        sound: z.boolean().optional(),
      })
      .optional(),
  }),
});

export const SettingsUpdateResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

// ==================== CHANNEL 3: CLEANUP DATA ====================

export const SettingsCleanupDataRequestSchema = z.object({
  dateRange: z.enum(['30天前', '自定义范围']),
}).strict();

export const SettingsCleanupDataResponseSchema = z.object({
  cutoffDate: z.string(), // YYYY-MM-DD
  reportCount: z.number(),
  itemCount: z.number(),
  sizeToFree: z.number(), // Bytes
});

// ==================== CHANNEL 4: DESTROY FEEDBACK ====================

export const SettingsDestroyFeedbackRequestSchema = z
  .object({
    confirmation: z.string().refine((val) => val === '确认删除', {
      message: 'Must type exactly "确认删除"',
    }),
  })
  .strict();

export const SettingsDestroyFeedbackResponseSchema = z.object({
  success: z.boolean(),
  deletedCount: z.number(),
  error: z.string().optional(),
});

// ==================== REGISTRATION FUNCTION ====================

/**
 * Register all settings validators
 *
 * @param registry - IPCValidatorRegistry instance
 * @param db - Database instance for handlers
 */
export function registerSettingsValidators(
  registry: typeof IPCValidatorRegistry,
  db: Database
): void {
  // Channel 1: Get all settings
  registry.register(
    IPC_CHANNELS.SETTINGS_GET_ALL,
    {
      requestSchema: SettingsGetAllRequestSchema,
      responseSchema: SettingsGetAllResponseSchema,
      handler: async () => handlers.handleGetAllSettings(db),
    }
  );

  // Channel 2: Update settings
  registry.register(
    IPC_CHANNELS.SETTINGS_UPDATE,
    {
      requestSchema: SettingsUpdateRequestSchema,
      responseSchema: SettingsUpdateResponseSchema,
      handler: async (request) => handlers.handleUpdateSettings(db, request),
    }
  );

  // Channel 3: Cleanup data
  registry.register(
    IPC_CHANNELS.SETTINGS_CLEANUP_DATA,
    {
      requestSchema: SettingsCleanupDataRequestSchema,
      responseSchema: SettingsCleanupDataResponseSchema,
      handler: async (request) => handlers.handleCleanupData(db, request.dateRange),
    }
  );

  // Channel 4: Destroy feedback
  registry.register(
    IPC_CHANNELS.SETTINGS_DESTROY_FEEDBACK,
    {
      requestSchema: SettingsDestroyFeedbackRequestSchema,
      responseSchema: SettingsDestroyFeedbackResponseSchema,
      handler: async (request) =>
        handlers.handleDestroyFeedback(db, request.confirmation),
    }
  );
}

// ==================== TYPE EXPORTS ====================

export type SettingsGetAllResponse = z.infer<typeof SettingsGetAllResponseSchema>;
export type SettingsUpdateRequest = z.infer<typeof SettingsUpdateRequestSchema>;
export type SettingsUpdateResponse = z.infer<typeof SettingsUpdateResponseSchema>;
