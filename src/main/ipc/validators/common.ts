/**
 * Common Zod Schemas
 *
 * Reusable schemas shared across multiple domains.
 * Import these in domain validator files to avoid duplication.
 */

import { z } from 'zod';

// ==================== EMAIL CLIENT ====================

/**
 * Email client types supported by the application
 */
export const EmailClientTypeSchema = z.enum([
  'thunderbird',
  'outlook',
  'apple-mail',
]);

/**
 * Email client configuration
 */
export const EmailClientConfigSchema = z.object({
  type: EmailClientTypeSchema,
  path: z.string().min(1, 'Path is required'),
});

// ==================== SCHEDULE ====================

/**
 * Report generation time (24-hour format)
 */
export const GenerationTimeSchema = z.object({
  hour: z
    .number()
    .int()
    .min(0, 'Hour must be 0-23')
    .max(23, 'Hour must be 0-23'),
  minute: z
    .number()
    .int()
    .min(0, 'Minute must be 0-59')
    .max(59, 'Minute must be 0-59'),
});

/**
 * Schedule configuration
 */
export const ScheduleConfigSchema = z.object({
  generationTime: GenerationTimeSchema,
  skipWeekends: z.boolean(),
});

// ==================== LLM CONFIGURATION ====================

/**
 * LLM mode (local vs remote)
 */
export const LLMModeSchema = z.enum(['local', 'remote']);

/**
 * Local LLM configuration (Ollama)
 */
export const LocalLLMConfigSchema = z.object({
  mode: z.literal('local'),
  endpoint: z.string().url('Must be valid URL').optional(),
});

/**
 * Remote LLM configuration (OpenAI-compatible API)
 */
export const RemoteLLMConfigSchema = z.object({
  mode: z.literal('remote'),
  endpoint: z
    .string()
    .url('Must be valid URL')
    .refine((val) => val.startsWith('https://'), {
      message: 'Remote mode requires HTTPS',
    })
    .optional(),
  apiKey: z
    .string()
    .min(20, 'API key must be at least 20 characters')
    .optional(),
});

/**
 * Union of LLM configurations
 */
export const LLMConfigSchema = z.union([
  LocalLLMConfigSchema,
  RemoteLLMConfigSchema,
]);

// ==================== NOTIFICATIONS ====================

/**
 * Notification priority levels
 */
export const NotificationPrioritySchema = z.enum(['low', 'normal', 'urgent']);

/**
 * Notification types
 */
export const NotificationTypeSchema = z.enum([
  'report_complete',
  'error',
  'system',
]);

// ==================== RESPONSE SHAPES ====================

/**
 * Success response wrapper
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
});

/**
 * Generic error response
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

/**
 * Response with data
 */
export const ResponseWithDataSchema = <TData extends z.ZodTypeAny>(
  data: TData
) =>
  z.object({
    success: z.literal(true),
    data,
  });

// ==================== TYPE EXPORTS ====================

// Export inferred TypeScript types for use in handlers
export type EmailClientType = z.infer<typeof EmailClientTypeSchema>;
export type GenerationTime = z.infer<typeof GenerationTimeSchema>;
export type LLMMode = z.infer<typeof LLMModeSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
