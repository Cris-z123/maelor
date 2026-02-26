/**
 * FeedbackDialog Utilities
 *
 * Helper functions for feedback type operations.
 * Separated from FeedbackDialog component for Fast Refresh compatibility.
 */

import type { FeedbackType } from './FeedbackDialog';

/**
 * Feedback option for form selection
 */
interface FeedbackOption {
  value: FeedbackType;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * Feedback options for the 4 error categories
 * Displayed as selectable cards in the dialog
 */
export const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    value: 'content_error',
    label: '内容错误',
    description: '提取的项目内容不准确或与原文不符',
  },
  {
    value: 'priority_error',
    label: '类型错误',
    description: '已完成/待办状态标记错误',
  },
  {
    value: 'not_actionable',
    label: '非行动项',
    description: '这不是一个需要采取行动的任务',
  },
  {
    value: 'source_error',
    label: '来源错误',
    description: '关联的源邮件不正确',
  },
];

/**
 * Helper function to get display label for feedback type
 */
export function getFeedbackTypeLabel(type: FeedbackType): string {
  const option = FEEDBACK_OPTIONS.find((opt) => opt.value === type);
  return option?.label || type;
}

/**
 * Helper function to get description for feedback type
 */
export function getFeedbackTypeDescription(type: FeedbackType): string {
  const option = FEEDBACK_OPTIONS.find((opt) => opt.value === type);
  return option?.description || '';
}
