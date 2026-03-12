/**
 * FeedbackButtons Component - Redesigned
 *
 * User feedback buttons with enhanced visual design.
 * Features:
 * - Larger, more prominent buttons
 * - Smooth animations
 * - Icon-based design
 * - Gradient hover effects
 */

import { Check, X } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@renderer/components/ui/tooltip';
import { cn } from '@renderer/lib/utils';

export interface FeedbackButtonsProps {
  onMarkCorrect: () => void;
  onMarkIncorrect: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const FeedbackButtons = ({
  onMarkCorrect,
  onMarkIncorrect,
  disabled = false,
  className = '',
  size = 'default',
}: FeedbackButtonsProps) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <TooltipProvider>
        {/* Mark Correct Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={size}
              onClick={onMarkCorrect}
              disabled={disabled}
              className={cn(
                'group relative overflow-hidden transition-all duration-200',
                'border-success/30 hover:border-success/50',
                'hover:bg-success/10 hover:shadow-md',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="标记准确"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/10 to-success/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Check className="h-5 w-5 text-success relative z-10 transition-transform group-hover:scale-110" strokeWidth={2.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium">标记准确</p>
          </TooltipContent>
        </Tooltip>

        {/* Mark Incorrect Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={size}
              onClick={onMarkIncorrect}
              disabled={disabled}
              className={cn(
                'group relative overflow-hidden transition-all duration-200',
                'border-destructive/30 hover:border-destructive/50',
                'hover:bg-destructive/10 hover:shadow-md',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="标记错误"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/10 to-destructive/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <X className="h-5 w-5 text-destructive relative z-10 transition-transform group-hover:scale-110" strokeWidth={2.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium">标记错误</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

/**
 * Compact version for inline display
 */
export const FeedbackButtonsCompact = (props: FeedbackButtonsProps) => {
  return (
    <FeedbackButtons
      {...props}
      size="icon"
      className="gap-2"
    />
  );
};

export default FeedbackButtons;
