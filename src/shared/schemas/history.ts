import { z } from 'zod';
import { ConfidenceLevelSchema } from './reports';

/**
 * Zod schemas for historical search
 * Per data-model.md section 5
 */

export const SearchFiltersSchema = z.object({
  itemType: z.enum(['completed', 'pending', 'all']).optional(),
  confidenceLevel: ConfidenceLevelSchema.optional(),
  hasFeedback: z.boolean().optional(),
  dateRange: z
    .object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
});

export const PaginationParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SearchQuerySchema = z.object({
  keywords: z.string().min(1),
  filters: SearchFiltersSchema.optional(),
  pagination: PaginationParamsSchema,
});

// Type exports
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
