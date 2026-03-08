import { z } from 'zod';

/**
 * Zod schemas for daily report display
 * Per data-model.md section 2
 */

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const ConfidenceDisplaySchema = z.object({
  score: z.number().min(0).max(1),
  level: ConfidenceLevelSchema,
});

export const ReportFeedbackTypeSchema = z.enum([
  'content_error',
  'priority_error',
  'not_actionable',
  'source_error',
]);

export const FeedbackSubmissionSchema = z.object({
  itemId: z.string().uuid(),
  feedbackType: ReportFeedbackTypeSchema,
  timestamp: z.number(),
});

export const ReportItemSourceRefSchema = z.object({
  hash: z.string(),
  senderName: z.string(),
  senderDomain: z.string(),
  date: z.string(),
  subject: z.string(),
});

export const ReportDisplayItemSchema = z.object({
  itemId: z.string(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemType: z.enum(['completed', 'pending']),
  content: z.object({
    title: z.string().max(200),
    description: z.string().max(500).optional(),
    dueDate: z.string().nullable(),
    priority: z.enum(['high', 'medium', 'low']),
  }),
  confidence: ConfidenceDisplaySchema,
  sourceStatus: z.enum(['verified', 'unverified']),
  sourceEmails: z.array(ReportItemSourceRefSchema),
});

// Type exports
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type ConfidenceDisplay = z.infer<typeof ConfidenceDisplaySchema>;
export type ReportFeedbackType = z.infer<typeof ReportFeedbackTypeSchema>;
export type ReportDisplayItem = z.infer<typeof ReportDisplayItemSchema>;

// Legacy exports for compatibility
export const FeedbackTypeSchema = ReportFeedbackTypeSchema;
export type FeedbackType = ReportFeedbackType;
export const ItemSourceRefSchema = ReportItemSourceRefSchema;
