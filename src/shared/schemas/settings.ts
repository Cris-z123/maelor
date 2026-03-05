import { z } from 'zod';

/**
 * Zod schemas for settings management
 * Per data-model.md section 6
 */

export const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  doNotDisturb: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '无效时间格式'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '无效时间格式'),
  }),
  soundEnabled: z.boolean(),
});

export const DisplaySettingsSchema = z.object({
  aiExplanationMode: z.boolean(),
});

// Reuse schemas from onboarding
export const AllSettingsSchema = z.object({
  notifications: NotificationSettingsSchema,
  display: DisplaySettingsSchema,
});

// Type exports
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type DisplaySettings = z.infer<typeof DisplaySettingsSchema>;
export type AllSettings = z.infer<typeof AllSettingsSchema>;
