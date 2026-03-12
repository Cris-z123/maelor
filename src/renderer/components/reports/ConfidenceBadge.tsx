/**
 * ConfidenceBadge Component - Redesigned
 *
 * Displays confidence level badge with enhanced visual design.
 * Features:
 * - Icon-based indicators
 * - Gradient backgrounds
 * - Smooth animations
 * - Multiple display modes
 */

import React from 'react';
import { Check, AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from '@renderer/components/ui/badge';
import { ConfidenceThresholds } from '@shared/utils/ConfidenceThresholds';
import { cn } from '@renderer/lib/utils';

export interface ConfidenceBadgeProps {
  confidence: number;
  mode?: 'default' | 'ai-explanation';
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  mode = 'default',
  className = '',
}) => {
  const classification = ConfidenceThresholds.classify(confidence);

  // AI explanation mode
  if (mode === 'ai-explanation') {
    const levelTextMap = {
      high: '高',
      medium: '中',
      low: '低',
    };

    const colors = {
      high: 'from-success/20 to-success/5 border-success/50 text-success',
      medium: 'from-warning/20 to-warning/5 border-warning/50 text-warning',
      low: 'from-destructive/20 to-destructive/5 border-destructive/50 text-destructive',
    };

    return (
      <Badge
        variant="outline"
        className={cn(
          'font-mono text-xs px-3 py-1 bg-gradient-to-r',
          colors[classification.level],
          className
        )}
        data-testid="confidence-badge"
      >
        {confidence.toFixed(2)} ({levelTextMap[classification.level]})
      </Badge>
    );
  }

  // Default mode with icons
  if (classification.level === 'high') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
          'bg-gradient-to-r from-success/10 to-success/5',
          'border border-success/30',
          'text-success font-medium text-sm',
          'transition-all duration-200',
          className
        )}
        data-testid="confidence-badge"
      >
        <Check className="w-4 h-4" strokeWidth={2.5} />
        <span>准确</span>
      </div>
    );
  }

  if (classification.level === 'medium') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
          'bg-gradient-to-r from-warning/10 to-warning/5',
          'border border-warning/30',
          'text-warning font-medium text-sm',
          'transition-all duration-200',
          className
        )}
        data-testid="confidence-badge"
      >
        <AlertTriangle className="w-4 h-4" />
        <span>需复核</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
        'bg-gradient-to-r from-destructive/10 to-destructive/5',
        'border border-destructive/30',
        'text-destructive font-semibold text-sm',
        'transition-all duration-200 animate-pulse',
        className
      )}
      data-testid="confidence-badge"
    >
      <AlertCircle className="w-4 h-4" />
      <span>需复核</span>
    </div>
  );
};
