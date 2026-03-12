/**
 * ConfidenceSummaryBanner Component - Redesigned
 *
 * Displays summary banner with enhanced visual design.
 * Features:
 * - Large, clear number displays
 * - Visual indicators with icons
 * - Gradient backgrounds
 * - Smooth animations
 */

import React from 'react';
import { Check, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/utils';

export interface ConfidenceSummaryBannerProps {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  className?: string;
}

export const ConfidenceSummaryBanner: React.FC<ConfidenceSummaryBannerProps> = ({
  highCount,
  mediumCount,
  lowCount,
  className = '',
}) => {
  const total = highCount + mediumCount + lowCount;
  const needsReview = mediumCount + lowCount;

  return (
    <Card className={cn(
      'card-elevated border-2 border-border/50 overflow-hidden',
      className
    )} data-testid="confidence-summary-banner">
      <CardContent className="p-0">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-muted/50 to-muted/30 px-6 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
              置信度总览
            </span>
            <span className="text-sm text-muted-foreground">
              共 {total} 个事项
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 divide-x divide-border/50">
          {/* High Confidence */}
          <div className="p-6 hover:bg-success/5 transition-colors duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
                <Check className="w-5 h-5 text-success" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">准确</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-success">
                {highCount}
              </span>
              <span className="text-sm text-muted-foreground">条</span>
            </div>
            {total > 0 && (
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success to-success/80 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(highCount / total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Medium Confidence */}
          <div className="p-6 hover:bg-warning/5 transition-colors duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">需复核</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-warning">
                {mediumCount}
              </span>
              <span className="text-sm text-muted-foreground">条</span>
            </div>
            {total > 0 && (
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-warning to-warning/80 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(mediumCount / total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Low Confidence */}
          <div className="p-6 hover:bg-destructive/5 transition-colors duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">需复核</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-destructive">
                {lowCount}
              </span>
              <span className="text-sm text-muted-foreground">条</span>
            </div>
            {total > 0 && (
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-destructive to-destructive/80 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(lowCount / total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        {needsReview > 0 && (
          <div className="bg-gradient-to-r from-warning/10 via-destructive/10 to-warning/10 px-6 py-3 border-t border-border/50">
            <div className="flex items-center justify-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />
              <span className="text-foreground font-medium">
                {needsReview} 个事项需要复核
              </span>
              <span className="text-muted-foreground">
                (建议查看原始邮件确认)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
