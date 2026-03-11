/**
 * ItemDetails Component
 *
 * Displays detailed information about an extracted action item.
 * Per T040 task specification:
 * - Render extraction rationale
 * - Render email metadata (source emails)
 * - Render copy search term button
 * - Show copied confirmation
 * - Render confidence breakdown in AI mode
 * - Not render confidence breakdown in default mode
 *
 * @module renderer/components/reports/ItemDetails
 */

import React from 'react';
import { Copy, Check } from 'lucide-react';

export interface DisplayItem {
  id: string;
  content: {
    title: string;
    description?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
  };
  confidence: {
    score: number;
    level: 'high' | 'medium' | 'low';
  };
  sourceEmails: Array<{
    sender: string;
    subject: string;
    date: string;
  }>;
}

export interface ItemDetailsProps {
  item: DisplayItem;
  aiExplanationMode: boolean;
  searchTerm: string;
  onCopy: (text: string) => Promise<boolean>;
  copied: boolean;
}

/**
 * ItemDetails component
 *
 * Shows comprehensive details about an action item including:
 * - Content information (title, description, due date, priority)
 * - Source emails that generated this item
 * - Copy search term functionality
 * - Confidence breakdown (AI mode only)
 */
export const ItemDetails: React.FC<ItemDetailsProps> = ({
  item,
  aiExplanationMode,
  searchTerm,
  onCopy,
  copied,
}) => {
  const handleCopy = async () => {
    await onCopy(searchTerm);
  };

  const getConfidenceLevelText = (level: string): string => {
    switch (level) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Unknown';
    }
  };

  const getPriorityText = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {/* Content Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">{item.content.title}</h3>
        {item.content.description && (
          <p className="text-sm text-gray-600">{item.content.description}</p>
        )}
        <div className="flex gap-4 text-sm">
          {item.content.dueDate && (
            <div>
              <span className="font-medium text-gray-700">Due Date:</span>{' '}
              <span className="text-gray-600">{item.content.dueDate}</span>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-700">Priority:</span>{' '}
            <span className="text-gray-600">{getPriorityText(item.content.priority)}</span>
          </div>
        </div>
      </div>

      {/* Extraction Rationale Section */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Extraction Rationale</h4>
        <p className="text-sm text-gray-600">
          This action item was extracted from your emails using AI-powered analysis.
          The confidence score reflects how certain the system is about this extraction.
        </p>
      </div>

      {/* Source Emails Section */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Source Emails</h4>
        <div className="space-y-2">
          {item.sourceEmails.map((email) => (
            <div key={`${email.sender}-${email.date}`} className="bg-gray-50 rounded-md p-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{email.subject}</div>
                <div className="text-gray-600 mt-1">
                  <span>From: {email.sender}</span>
                  <span className="mx-2">•</span>
                  <span>{email.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Copy Search Term Button */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label="Copy search term"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Search Term</span>
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Copy the search term to find related emails in your inbox
        </p>
      </div>

      {/* Confidence Breakdown (AI Mode Only) */}
      {aiExplanationMode && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Confidence Breakdown</h4>
          <div className="bg-gray-50 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Confidence Score</span>
              <span className="text-lg font-semibold text-gray-900">
                {Math.round(item.confidence.score * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  item.confidence.level === 'high'
                    ? 'bg-green-500'
                    : item.confidence.level === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${item.confidence.score * 100}%` }}
              />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Level:</span>{' '}
              {getConfidenceLevelText(item.confidence.level)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
