import { z } from 'zod';

/**
 * Zod schemas for onboarding wizard
 * Per data-model.md section 1
 */

export const EmailClientConfigSchema = z.object({
  type: z.enum(['thunderbird', 'outlook', 'apple-mail']),
  path: z.string().min(1, '路径不能为空'),
  detectedPath: z.string().nullable(),
  validated: z.boolean(),
});

export const ScheduleConfigSchema = z.object({
  generationTime: z.object({
    hour: z.number().int().min(0).max(23, '请输入有效小时 (0-23)'),
    minute: z.number().int().min(0).max(59, '请输入有效分钟 (0-59)'),
  }),
  skipWeekends: z.boolean(),
});

export const OnboardingLLMConfigSchema = z.object({
  mode: z.enum(['local', 'remote']),
  localEndpoint: z.string().url('请输入有效的本地服务地址'),
  remoteEndpoint: z.string().url('请输入有效的HTTPS地址'),
  apiKey: z.string().min(20, 'API密钥至少20字符'),
  connectionStatus: z.enum(['untested', 'success', 'failed']),
});

export const OnboardingStateSchema = z.object({
  completed: z.boolean(),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  emailClient: EmailClientConfigSchema,
  schedule: ScheduleConfigSchema,
  llm: OnboardingLLMConfigSchema,
  lastUpdated: z.number(),
});

// Type exports
export type EmailClientConfig = z.infer<typeof EmailClientConfigSchema>;
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export type OnboardingLLMConfig = z.infer<typeof OnboardingLLMConfigSchema>;
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

// Legacy exports for compatibility
export const LLMConfigSchema = OnboardingLLMConfigSchema;
export type LLMConfig = OnboardingLLMConfig;
