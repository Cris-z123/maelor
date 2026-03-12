/**
 * ItemCard Component - Redesigned
 *
 * Displays a single action item with expandable details.
 * Features:
 * - Enhanced visual design with gradients
 * - Smooth expand/collapse animations
 * - Integrated feedback buttons
 * - Confidence-based styling
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FeedbackButtons } from './FeedbackButtons';
import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';

interface ReportDisplayItem {
  id: number;
  title: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  dueDate?: string;
  sender?: string;
  subject?: string;
  date?: string;
  searchTerms?: string;
}

interface ItemCardProps {
  item: ReportDisplayItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  mode?: 'default' | 'ai-explanation';
  onMarkCorrect?: () => void;
  onMarkIncorrect?: () => void;
}

export function ItemCard({
  item,
  isExpanded,
  onToggleExpand,
  mode = 'default',
  onMarkCorrect = () => {},
  onMarkIncorrect = () => {}
}: ItemCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySearch = async () => {
    if (item.searchTerms) {
      await navigator.clipboard.writeText(item.searchTerms);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confidenceClass = item.confidence >= 0.8
    ? 'confidence-high'
    : item.confidence >= 0.6
      ? 'confidence-medium'
      : 'confidence-low';

  return (
    <div
      className={cn(
        'card-elevated rounded-xl overflow-hidden transition-all duration-300',
        confidenceClass,
        isExpanded && 'shadow-lg'
      )}
    >
      {/* Header - Always Visible */}
      <div
        className="p-6 cursor-pointer hover:bg-muted/30 transition-colors duration-200"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
      >
        <div className="flex items-start gap-4">
          {/* Confidence Badge */}
          <div className="flex-shrink-0 pt-1">
            <ConfidenceBadge confidence={item.confidence} mode={mode} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-3">
            <h3 className="text-lg font-semibold text-foreground leading-relaxed">
              {item.title}
            </h3>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {item.sender && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">来源:</span> {item.sender}
                </span>
              )}
              {item.date && (
                <>
                  <span>•</span>
                  <span>{item.date}</span>
                </>
              )}
              {item.subject && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-xs">{item.subject}</span>
                </>
              )}
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between pt-2">
              <FeedbackButtons
                onMarkCorrect={(e) => {
                  e.stopPropagation();
                  onMarkCorrect();
                }}
                onMarkIncorrect={(e) => {
                  e.stopPropagation();
                  onMarkIncorrect();
                }}
                size="sm"
              />

              {item.searchTerms && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'gap-2 text-muted-foreground hover:text-foreground',
                    'transition-all duration-200'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopySearch();
                  }}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? '已复制' : '复制搜索词'}
                </Button>
              )}
            </div>
          </div>

          {/* Expand Icon */}
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            'transition-all duration-300',
            'bg-muted/50 hover:bg-muted'
          )}>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border/50 p-6 space-y-4 fade-in-stagger">
          {/* Description */}
          {item.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                详细描述
              </h4>
              <p className="text-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {/* Due Date */}
          {item.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-muted-foreground">截止日期:</span>
              <span className="text-foreground">{item.dueDate}</span>
            </div>
          )}

          {/* Priority Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">优先级:</span>
            <span className={cn(
              'px-2 py-1 rounded-md text-xs font-semibold',
              item.priority === 'high' && 'bg-destructive/10 text-destructive border border-destructive/30',
              item.priority === 'medium' && 'bg-warning/10 text-warning border border-warning/30',
              item.priority === 'low' && 'bg-muted text-muted-foreground border border-border'
            )}>
              {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
            </span>
          </div>

          {/* Confidence Details (AI Mode) */}
          {mode === 'ai-explanation' && (
            <div className="pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">置信度分数:</span>{' '}
                  <span className="font-mono text-foreground">
                    {item.confidence.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">置信度级别:</span>{' '}
                  <span className="text-foreground">
                    {item.confidence >= 0.8 ? '高' : item.confidence >= 0.6 ? '中' : '低'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
