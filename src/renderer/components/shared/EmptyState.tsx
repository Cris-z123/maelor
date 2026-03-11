import React from 'react';

export type EmptyStateVariant = 'no-report' | 'celebratory' | 'no-results';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  icon?: string;
  title: string;
  message: string;
  submessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  icon,
  title,
  message,
  submessage,
  actionLabel,
  onAction,
}) => {
  const getVariantStyles = (): string => {
    switch (variant) {
      case 'no-report':
        return 'bg-neutral-50 border-neutral-200';
      case 'celebratory':
        return 'bg-green-50 border-green-200';
      case 'no-results':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-neutral-50 border-neutral-200';
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 border-2 rounded-lg ${getVariantStyles()}`}
      data-testid="empty-state"
    >
      {icon && (
        <div
          className="text-6xl mb-4"
          role="img"
          aria-label="icon"
        >
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-600 text-center mb-4">{message}</p>
      {submessage && (
        <p className="text-neutral-500 text-center text-sm mb-4">{submessage}</p>
      )}
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors"
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
