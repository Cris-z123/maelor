/**
 * ReportView Container Component
 *
 * Displays the daily email processing report with summary, completed items,
 * and pending items. Handles loading, error, and empty states.
 *
 * Per T045 task specification:
 * - Load today's report on mount with useEffect
 * - Display SummaryBanner, completed/pending sections
 * - Handle loading, error, empty states
 * - Expand/collapse all buttons
 * - Keyboard navigation (Tab, Enter, Esc)
 * - Use reportStore for state
 *
 * @module renderer/components/reports/ReportView
 */

import { useEffect, useCallback, useMemo } from 'react'
import { useReportStore } from '@renderer/stores/reportStore'
import { SummaryBanner } from './SummaryBanner'
import { ItemCard } from './ItemCard'

interface ReportViewProps {
  className?: string
}

export function ReportView({ className = '' }: ReportViewProps) {
  const {
    items,
    loading,
    error,
    reportDate,
    expandedItems,
    aiExplanationMode,
    loadReport,
    clearError,
    toggleExpand,
    expandAll,
    collapseAll,
  } = useReportStore()

  // Load today's report on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    loadReport(today)
  }, [loadReport])

  // Handle retry on error (must be before early returns)
  const handleRetry = useCallback(() => {
    clearError()
    const today = new Date().toISOString().split('T')[0]
    loadReport(today)
  }, [clearError, loadReport])

  // Handle keyboard navigation (must be before early returns)
  const handleKeyDown = useCallback(
    (itemId: string, event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          toggleExpand(itemId)
          break
        case 'Escape':
          event.preventDefault()
          toggleExpand(itemId)
          break
        default:
          break
      }
    },
    [toggleExpand]
  )

  // Calculate derived state (must be before early returns)
  const completedItems = useMemo(
    () => items.filter((item) => item.item_type === 'completed'),
    [items]
  )

  const pendingItems = useMemo(
    () => items.filter((item) => item.item_type === 'pending'),
    [items]
  )

  const reviewCount = useMemo(
    () => items.filter((item) => item.confidence_score < 0.6).length,
    [items]
  )

  // Convert DisplayItem to ItemCard props (must be before early returns)
  const toItemCardProps = useCallback(
    (item: typeof items[0]) => ({
      id: parseInt(item.id) || 0,
      title: item.content,
      confidence: item.confidence_score,
      priority:
        item.confidence_score >= 0.8
          ? ('high' as const)
          : item.confidence_score >= 0.6
          ? ('medium' as const)
          : ('low' as const),
      description: item.content,
      sender: item.sources[0]?.search_string || '',
      subject: item.sources[0]?.evidence_text || '',
    }),
    []
  )

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
            role="status"
            aria-label="Loading report"
          />
          <p className="text-gray-600" role="status">
            Loading today&apos;s report...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <div
            className="text-red-600 text-6xl mb-4"
            role="img"
            aria-label="Error icon"
          >
            ⚠️
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Retry loading report"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // No report empty state
  if (!reportDate) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <div
            className="text-gray-400 text-6xl mb-4"
            role="img"
            aria-label="Empty state icon"
          >
            📊
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Report Available
          </h2>
          <p className="text-gray-600">
            There is no report available for today. Check back later.
          </p>
        </div>
      </div>
    )
  }

  // Celebratory empty state when report exists but has no items
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <div
            className="text-green-600 text-6xl mb-4"
            role="img"
            aria-label="Celebration icon"
          >
            🎉
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            All Caught Up!
          </h2>
          <p className="text-gray-600 mb-4">
            No emails to process today. You&apos;re all set!
          </p>
          <p className="text-sm text-gray-500">
            Check back later for new emails that need your attention.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`container mx-auto px-4 py-8 ${className}`}>
      {/* Summary Banner */}
      <SummaryBanner totalEmails={items.length} reviewCount={reviewCount} />

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={expandAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Expand all items"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Collapse all items"
        >
          Collapse All
        </button>
      </div>

      {/* Completed Section */}
      {completedItems.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Completed ({completedItems.length})
          </h2>
          <div className="space-y-4">
            {completedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleExpand(item.id)}
                onKeyDown={(e) => handleKeyDown(item.id, e)}
                tabIndex={0}
                role="button"
                aria-expanded={expandedItems.has(item.id)}
                className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
              >
                <ItemCard
                  item={toItemCardProps(item)}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpand(item.id)}
                  mode={aiExplanationMode ? 'ai-explanation' : 'default'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Section */}
      {pendingItems.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending ({pendingItems.length})
          </h2>
          <div className="space-y-4">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleExpand(item.id)}
                onKeyDown={(e) => handleKeyDown(item.id, e)}
                tabIndex={0}
                role="button"
                aria-expanded={expandedItems.has(item.id)}
                className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
              >
                <ItemCard
                  item={toItemCardProps(item)}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpand(item.id)}
                  mode={aiExplanationMode ? 'ai-explanation' : 'default'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No items message */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No items in this report</p>
        </div>
      )}
    </div>
  )
}
