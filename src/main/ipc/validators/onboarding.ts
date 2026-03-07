/**
 * Onboarding Domain Validators
 *
 * Validates all onboarding-related IPC channels (6 channels):
 * - onboarding:get-status
 * - onboarding:set-step
 * - onboarding:acknowledge
 * - onboarding:detect-email-client
 * - onboarding:validate-email-path
 * - onboarding:test-llm-connection
 */

import { z } from 'zod';
import { IPCValidatorRegistry } from './registry.js';
import { IPC_CHANNELS } from '../channels.js';
import * as handlers from '../handlers/onboardingHandler.js';
import type { Database } from 'better-sqlite3';

// Import common schemas
import {
  EmailClientTypeSchema,
  GenerationTimeSchema,
  LLMModeSchema,
} from './common.js';

// ==================== CHANNEL 1: GET STATUS ====================

export const OnboardingGetStatusRequestSchema = z.object({}).strict();

export const OnboardingGetStatusResponseSchema = z.object({
  hasAcknowledgedDisclosure: z.boolean(),
  disclosureVersion: z.string(),
  acknowledgedAt: z.number().optional(),
});

// ==================== CHANNEL 2: SET STEP ====================

export const OnboardingSetStepRequestSchema = z
  .object({
    step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    data: z
      .object({
        emailClient: z
          .object({
            type: EmailClientTypeSchema,
            path: z.string().min(1, 'Path is required'),
          })
          .optional(),
        schedule: z
          .object({
            generationTime: GenerationTimeSchema,
            skipWeekends: z.boolean(),
          })
          .optional(),
        llm: z
          .object({
            mode: LLMModeSchema,
            localEndpoint: z.string().url().optional(),
            remoteEndpoint: z.string().url().optional(),
            apiKey: z
              .string()
              .min(20, 'API key must be at least 20 characters')
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

export const OnboardingSetStepResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

// ==================== CHANNEL 3: ACKNOWLEDGE ====================

export const OnboardingAcknowledgeRequestSchema = z.object({}).strict();

export const OnboardingAcknowledgeResponseSchema = z.object({
  success: z.boolean(),
});

// ==================== CHANNEL 4: DETECT EMAIL CLIENT ====================

export const OnboardingDetectEmailClientRequestSchema = z
  .object({
    type: EmailClientTypeSchema,
  })
  .strict();

export const OnboardingDetectEmailClientResponseSchema = z.object({
  detectedPath: z.string().nullable(),
  error: z.string().optional(),
});

// ==================== CHANNEL 5: VALIDATE EMAIL PATH ====================

export const OnboardingValidateEmailPathRequestSchema = z
  .object({
    path: z.string().min(1, 'Path is required'),
  })
  .strict();

export const OnboardingValidateEmailPathResponseSchema = z.object({
  valid: z.boolean(),
  message: z.string(),
});

// ==================== CHANNEL 6: TEST LLM CONNECTION ====================

export const OnboardingTestLLMConnectionRequestSchema = z
  .object({
    mode: LLMModeSchema,
    localEndpoint: z.string().url().optional(),
    remoteEndpoint: z.string().url().optional(),
    apiKey: z.string().optional(),
  })
  .strict();

export const OnboardingTestLLMConnectionResponseSchema = z.object({
  success: z.boolean(),
  responseTime: z.number(),
  error: z.string().optional(),
});

// ==================== REGISTRATION FUNCTION ====================

/**
 * Register all onboarding validators
 *
 * @param registry - IPCValidatorRegistry instance
 * @param db - Database instance for handlers
 */
export function registerOnboardingValidators(
  registry: typeof IPCValidatorRegistry,
  db: Database
): void {
  // Channel 1: Get status
  registry.register(
    IPC_CHANNELS.ONBOARDING_GET_STATUS,
    {
      requestSchema: OnboardingGetStatusRequestSchema,
      responseSchema: OnboardingGetStatusResponseSchema,
      handler: async () => handlers.handleGetStatus(db),
    }
  );

  // Channel 2: Set step
  registry.register(
    IPC_CHANNELS.ONBOARDING_SET_STEP,
    {
      requestSchema: OnboardingSetStepRequestSchema,
      responseSchema: OnboardingSetStepResponseSchema,
      handler: async (request) =>
        handlers.handleSetStep(db, request.step, request.data),
    }
  );

  // Channel 3: Acknowledge
  registry.register(
    IPC_CHANNELS.ONBOARDING_ACKNOWLEDGE,
    {
      requestSchema: OnboardingAcknowledgeRequestSchema,
      responseSchema: OnboardingAcknowledgeResponseSchema,
      handler: async () => handlers.handleAcknowledge(db),
    }
  );

  // Channel 4: Detect email client
  registry.register(
    IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT,
    {
      requestSchema: OnboardingDetectEmailClientRequestSchema,
      responseSchema: OnboardingDetectEmailClientResponseSchema,
      handler: async (request) =>
        handlers.handleDetectEmailClient(db, request.type),
    }
  );

  // Channel 5: Validate email path
  registry.register(
    IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH,
    {
      requestSchema: OnboardingValidateEmailPathRequestSchema,
      responseSchema: OnboardingValidateEmailPathResponseSchema,
      handler: async (request) =>
        handlers.handleValidateEmailPath(db, request.path),
    }
  );

  // Channel 6: Test LLM connection
  registry.register(
    IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION,
    {
      requestSchema: OnboardingTestLLMConnectionRequestSchema,
      responseSchema: OnboardingTestLLMConnectionResponseSchema,
      handler: async (request) =>
        handlers.handleTestLLMConnection(db, request),
    }
  );
}

// ==================== TYPE EXPORTS ====================

export type OnboardingGetStatusRequest = z.infer<
  typeof OnboardingGetStatusRequestSchema
>;
export type OnboardingGetStatusResponse = z.infer<
  typeof OnboardingGetStatusResponseSchema
>;
export type OnboardingSetStepRequest = z.infer<
  typeof OnboardingSetStepRequestSchema
>;
export type OnboardingSetStepResponse = z.infer<
  typeof OnboardingSetStepResponseSchema
>;
export type OnboardingAcknowledgeRequest = z.infer<
  typeof OnboardingAcknowledgeRequestSchema
>;
export type OnboardingAcknowledgeResponse = z.infer<
  typeof OnboardingAcknowledgeResponseSchema
>;
export type OnboardingDetectEmailClientRequest = z.infer<
  typeof OnboardingDetectEmailClientRequestSchema
>;
export type OnboardingDetectEmailClientResponse = z.infer<
  typeof OnboardingDetectEmailClientResponseSchema
>;
export type OnboardingValidateEmailPathRequest = z.infer<
  typeof OnboardingValidateEmailPathRequestSchema
>;
export type OnboardingValidateEmailPathResponse = z.infer<
  typeof OnboardingValidateEmailPathResponseSchema
>;
export type OnboardingTestLLMConnectionRequest = z.infer<
  typeof OnboardingTestLLMConnectionRequestSchema
>;
export type OnboardingTestLLMConnectionResponse = z.infer<
  typeof OnboardingTestLLMConnectionResponseSchema
>;
