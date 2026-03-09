/**
 * ItemCard Component
 *
 * Displays a single action item with expandable details
 * Per T035 task specification:
 * - CSS-based 300ms animation
 * - Confidence badge display
 * - Expand/collapse with icon rotation
 * - Keyboard navigation (Enter, Space)
 * - Feedback buttons when expanded
 *
 * @module renderer/components/reports/ItemCard
 */

import { ConfidenceThresholds } from '@shared/utils/ConfidenceThresholds';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FeedbackButtons } from './FeedbackButtons';

interface ReportDisplayItem {
  id: number;
  title: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  dueDate?: string;
  sender?: string;
  subject?: string;
}

interface ItemCardProps {
  item: ReportDisplayItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ItemCard({ item, isExpanded, onToggleExpand }: ItemCardProps) {
  const confidenceDisplay = ConfidenceThresholds.classify(item.confidence || 0);

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200
        transition-all duration-300 ease-in-out cursor-pointer
        focus:ring-2 focus:ring-blue-500 focus:outline-none
        ${isExpanded ? 'shadow-md' : 'hover:shadow-md'}
      `}
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
      {/* Header - Always visible */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {confidenceDisplay.level === 'high' ? (
            <span className="text-green-600 text-sm font-medium">✓准确</span>
          ) : (
            <ConfidenceBadge confidence={item.confidence || 0} />
          )}
          <h3 className="flex-1 font-medium text-gray-900">{item.title}</h3>
          <svg
            className={`w-5 h-5 transition-transform duration-300 text-gray-500 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Details - Expandable with CSS animation */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Item details */}
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            {item.description && (
              <p>{item.description}</p>
            )}
            {item.sender && (
              <p><strong>From:</strong> {item.sender}</p>
            )}
            {item.subject && (
              <p><strong>Subject:</strong> {item.subject}</p>
            )}
            {item.dueDate && (
              <p><strong>Due:</strong> {item.dueDate}</p>
            )}
          </div>

          {/* Feedback buttons */}
          <div className="mt-4">
            <FeedbackButtons
              onMarkCorrect={() => {}}
              onMarkIncorrect={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
