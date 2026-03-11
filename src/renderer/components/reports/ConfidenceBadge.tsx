/**
 * ConfidenceBadge Component
 *
 * Displays confidence level badge for action items.
 * Per FR-011:
 * - ≥0.8: High confidence
 * - 0.6-0.79: Medium confidence (needs review)
 * - <0.6: Low confidence (source unconfirmed)
 *
 * Display modes (T044):
 * - Default mode: "✓准确" for high, badges for medium/low
 * - AI mode: "置信度 0.85 (高/中/低)" format
 *
 * Task: T051 [US2], T044 [US2]
 * @module renderer/components/reports/ConfidenceBadge
 */

import React from 'react';
import { Badge } from '@renderer/components/ui/badge';
import { ConfidenceThresholds } from '@shared/utils/ConfidenceThresholds';

/**
 * ConfidenceBadge props
 */
export interface ConfidenceBadgeProps {
  /** Confidence score (0-1) */
  confidence: number;
  /** Display mode */
  mode?: 'default' | 'ai-explanation';
  /** Additional CSS classes */
  className?: string;
}

/**
 * ConfidenceBadge component
 *
 * Shows appropriate badge based on confidence level and display mode:
 *
 * Default mode:
 * - High confidence (≥0.8): "✓准确"
 * - Medium confidence (0.6-0.79): Gray "[建议复核]"
 * - Low confidence (<0.6): Prominent red "[来源待确认]"
 *
 * AI explanation mode:
 * - All levels: "置信度 X.XX (高/中/低)" format
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  mode = 'default',
  className = '',
}) => {
  const classification = ConfidenceThresholds.classify(confidence);

  // AI explanation mode: show numeric score with level
  if (mode === 'ai-explanation') {
    const levelTextMap = {
      high: '高',
      medium: '中',
      low: '低',
    };

    return (
      <span
        className={`text-sm ${className}`}
        data-testid="confidence-badge"
      >
        置信度 {confidence.toFixed(2)} ({levelTextMap[classification.level]})
      </span>
    );
  }

  // Default mode: "✓准确" for high confidence
  if (classification.level === 'high') {
    return (
      <span
        className={`text-green-600 text-sm font-medium ${className}`}
        data-testid="confidence-badge"
      >
        ✓准确
      </span>
    );
  }

  // Default mode: gray badge for medium confidence
  if (classification.level === 'medium') {
    return (
      <Badge
        variant="secondary"
        className={`bg-gray-100 text-gray-700 border border-gray-300 font-medium ${className}`}
        data-testid="confidence-badge"
      >
        {classification.label}
      </Badge>
    );
  }

  // Default mode: prominent red badge for low confidence
  return (
    <Badge
      variant="destructive"
      className={`bg-red-100 text-red-700 border-2 border-red-300 font-semibold ${className}`}
      data-testid="confidence-badge"
    >
      {classification.label}
    </Badge>
  );
};
