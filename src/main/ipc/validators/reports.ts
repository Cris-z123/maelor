/**
 * Zod validators for reports IPC channels
 *
 * Provides runtime validation for all reports-related IPC payloads
 * Per constitution: All IPC channels must use Zod validation
 *
 * @module main/ipc/validators/reports
 */

import { z } from 'zod';

/**
 * Validator for reports:get-today
 * No parameters required
 */
export const GetTodaySchema = z.object({});

/**
 * Validator for reports:get-by-date
 * Requires date in YYYY-MM-DD format
 */
export const GetByDateSchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
});

/**
 * Validator for reports:expand-item
 * Requires positive itemId and boolean isExpanded
 */
export const ExpandItemSchema = z.object({
  itemId: z.number()
    .int('itemId must be an integer')
    .positive('itemId must be positive'),
  isExpanded: z.boolean()
});

/**
 * Validator for reports:copy-search-term
 * Requires positive itemId
 */
export const CopySearchTermSchema = z.object({
  itemId: z.number()
    .int('itemId must be an integer')
    .positive('itemId must be positive')
});
