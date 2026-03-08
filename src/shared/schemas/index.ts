/**
 * Zod schemas barrel export
 */

// Re-export existing core schemas
export * from './validation.js';

// Domain-specific schemas - selective exports to avoid conflicts
export {
  EmailClientConfigSchema,
  ScheduleConfigSchema,
  OnboardingLLMConfigSchema,
  OnboardingStateSchema,
  type EmailClientConfig,
  type ScheduleConfig,
  type OnboardingLLMConfig,
  type OnboardingState,
  type LLMConfig,
} from './onboarding.js';

export {
  ConfidenceLevelSchema,
  ConfidenceDisplaySchema,
  ReportFeedbackTypeSchema,
  FeedbackSubmissionSchema,
  ReportItemSourceRefSchema,
  ReportDisplayItemSchema,
  type ConfidenceLevel,
  type ConfidenceDisplay,
  type ReportFeedbackType,
  type ReportDisplayItem,
  type FeedbackType,
} from './reports.js';

export * from './history.js';
export * from './settings.js';
