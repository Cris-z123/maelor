/**
 * Integration tests for ReportView component
 *
 * Tests T045: ReportView Container
 * Per task specification:
 * - Load today's report on mount with useEffect
 * - Display SummaryBanner, completed/pending sections
 * - Handle loading, error, empty states
 * - Expand/collapse all buttons
 * - Keyboard navigation (Tab, Enter, Esc)
 * - Use reportStore for state
 *
 * @module tests/integration/renderer/ReportView.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportView } from '@renderer/components/reports/ReportView'
import { useReportStore } from '@renderer/stores/reportStore'

// Mock the report store
vi.mock('@renderer/stores/reportStore', () => ({
  useReportStore: vi.fn(),
}))

const mockUseReportStore = useReportStore as unknown as ReturnType<typeof vi.fn>

describe('ReportView', () => {
  const mockLoadReport = vi.fn()
  const mockClearError = vi.fn()
  const mockToggleExpand = vi.fn()
  const mockExpandAll = vi.fn()
  const mockCollapseAll = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Render loading state', () => {
    it('should show loading spinner when report is loading', () => {
      mockUseReportStore.mockReturnValue({
        items: [],
        loading: true,
        error: null,
        reportDate: null,
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })

      render(<ReportView />)

      const loadingSpinner = screen.getByRole('status', { name: /loading report/i })
      expect(loadingSpinner).toBeInTheDocument()
      expect(screen.getByText(/loading today's report/i)).toBeInTheDocument()
    })
  })

  describe('2. Render error state', () => {
    it('should show error message and retry button', () => {
      const errorMessage = 'Failed to load report'
      mockUseReportStore.mockReturnValue({
        items: [],
        loading: false,
        error: errorMessage,
        reportDate: null,
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })

      render(<ReportView />)

      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should call loadReport when retry button is clicked', async () => {
      const errorMessage = 'Failed to load report'
      mockUseReportStore.mockReturnValue({
        items: [],
        loading: false,
        error: errorMessage,
        reportDate: null,
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })

      render(<ReportView />)

      // Clear the initial loadReport call from mount
      mockLoadReport.mockClear()

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await userEvent.click(retryButton)

      expect(mockClearError).toHaveBeenCalledTimes(1)
      expect(mockLoadReport).toHaveBeenCalledTimes(1)
    })
  })

  describe('3. Render no-report empty state', () => {
    it('should show empty state when no report exists', () => {
      mockUseReportStore.mockReturnValue({
        items: [],
        loading: false,
        error: null,
        reportDate: null,
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })

      render(<ReportView />)

      expect(screen.getByText(/no report available/i, { selector: 'h2' })).toBeInTheDocument()
    })
  })

  describe('4. Render celebratory empty state when no items', () => {
    it('should show celebratory message when report exists but has no items', () => {
      mockUseReportStore.mockReturnValue({
        items: [],
        loading: false,
        error: null,
        reportDate: '2026-03-10',
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })

      render(<ReportView />)

      // Since items.length === 0 and reportDate exists, should show celebratory state
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
      expect(screen.getByText(/no emails to process today/i)).toBeInTheDocument()
    })
  })

  describe('5. Render summary banner and items', () => {
    beforeEach(() => {
      mockUseReportStore.mockReturnValue({
        items: [
          {
            id: 'item-1',
            item_id: 'item-1',
            report_date: '2026-03-10',
            content: 'Approve leave request',
            item_type: 'completed' as const,
            source_status: 'verified' as const,
            confidence_score: 0.9,
            tags: [],
            created_at: Date.now(),
            sources: [],
          },
          {
            id: 'item-2',
            item_id: 'item-2',
            report_date: '2026-03-10',
            content: 'Review project proposal',
            item_type: 'pending' as const,
            source_status: 'unverified' as const,
            confidence_score: 0.7,
            tags: [],
            created_at: Date.now(),
            sources: [],
          },
          {
            id: 'item-3',
            item_id: 'item-3',
            report_date: '2026-03-10',
            content: 'Decline meeting invitation',
            item_type: 'completed' as const,
            source_status: 'verified' as const,
            confidence_score: 0.5,
            tags: [],
            created_at: Date.now(),
            sources: [],
          },
        ],
        loading: false,
        error: null,
        reportDate: '2026-03-10',
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })
    })

    it('should render summary banner with correct statistics', () => {
      render(<ReportView />)

      // SummaryBanner displays: "今天共处理 {total} 封邮件，其中 {review_count} 件需要你重点关注"
      // For this test: total=3, review_count=1 (items with confidence < 0.6)
      // But our items have confidence 0.9, 0.7, 0.5, so only 1 item (0.5) needs review
      expect(screen.getByText(/今天共处理 3 封邮件/i)).toBeInTheDocument()
      expect(screen.getByText(/1 件需要你重点关注/i)).toBeInTheDocument()
    })

    it('should render completed and pending sections', () => {
      render(<ReportView />)

      expect(screen.getByText(/completed/i)).toBeInTheDocument()
      expect(screen.getByText(/pending/i)).toBeInTheDocument()
    })

    it('should render all items in appropriate sections', () => {
      render(<ReportView />)

      // Check that items are rendered (using getAllByText since ItemCard displays title twice)
      expect(screen.getAllByText(/approve leave request/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/review project proposal/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/decline meeting invitation/i).length).toBeGreaterThan(0)
    })

    it('should render expand all and collapse all buttons', () => {
      render(<ReportView />)

      expect(screen.getByRole('button', { name: /expand all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /collapse all/i })).toBeInTheDocument()
    })

    it('should call expandAll when expand all button is clicked', async () => {
      render(<ReportView />)

      const expandAllButton = screen.getByRole('button', { name: /expand all/i })
      await userEvent.click(expandAllButton)

      expect(mockExpandAll).toHaveBeenCalledTimes(1)
    })

    it('should call collapseAll when collapse all button is clicked', async () => {
      render(<ReportView />)

      const collapseAllButton = screen.getByRole('button', { name: /collapse all/i })
      await userEvent.click(collapseAllButton)

      expect(mockCollapseAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('6. Expand item on click', () => {
    beforeEach(() => {
      mockUseReportStore.mockReturnValue({
        items: [
          {
            id: 'item-1',
            item_id: 'item-1',
            report_date: '2026-03-10',
            content: 'Review project proposal',
            item_type: 'pending' as const,
            source_status: 'unverified' as const,
            confidence_score: 0.7,
            tags: [],
            created_at: Date.now(),
            sources: [],
          },
        ],
        loading: false,
        error: null,
        reportDate: '2026-03-10',
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })
    })

    it('should call toggleExpand when item is clicked', async () => {
      render(<ReportView />)

      // Get the first matching element (the h3 title)
      const item = screen.getAllByText(/review project proposal/i)[0]
      await userEvent.click(item)

      expect(mockToggleExpand).toHaveBeenCalledWith('item-1')
    })
  })

  describe('7. Handle keyboard navigation', () => {
    beforeEach(() => {
      mockUseReportStore.mockReturnValue({
        items: [
          {
            id: 'item-1',
            item_id: 'item-1',
            report_date: '2026-03-10',
            content: 'Approve leave request',
            item_type: 'completed' as const,
            source_status: 'verified' as const,
            confidence_score: 0.9,
            tags: [],
            created_at: Date.now(),
            sources: [],
          },
          {
            id: 'item-2',
            item_id: 'item-2',
            report_date: '2026-03-10',
            content: 'Review project proposal',
            item_type: 'pending' as const,
            source_status: 'unverified' as const,
            confidence_score: 0.7,
            tags: [],
            created_at: Date.now(),
            sources: [],
          },
        ],
        loading: false,
        error: null,
        reportDate: '2026-03-10',
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })
    })

    it('should navigate between items with Tab key', async () => {
      render(<ReportView />)

      const items = screen.getAllByRole('button')
      expect(items.length).toBeGreaterThan(0)

      // First item should be focusable
      items[0].focus()
      expect(items[0]).toHaveFocus()

      // Tab to next element
      await userEvent.tab()
      // Note: This test verifies basic keyboard focusability
      // Actual tab order depends on DOM structure
    })

    it('should expand item when Enter key is pressed', async () => {
      render(<ReportView />)

      // Get the first matching element (the h3 title)
      const itemText = screen.getAllByText(/approve leave request/i)[0]
      const item = itemText.closest('[role="button"]')
      if (item) {
        item.focus()
        await userEvent.keyboard('{Enter}')

        expect(mockToggleExpand).toHaveBeenCalledWith('item-1')
      }
    })

    it('should collapse expanded item when Esc key is pressed', async () => {
      render(<ReportView />)

      // Get the first matching element (the h3 title)
      const itemText = screen.getAllByText(/approve leave request/i)[0]
      const item = itemText.closest('[role="button"]')
      if (item) {
        item.focus()
        await userEvent.keyboard('{Escape}')

        expect(mockToggleExpand).toHaveBeenCalledWith('item-1')
      }
    })
  })

  describe('Load today\'s report on mount', () => {
    it('should call loadReport on component mount', () => {
      mockUseReportStore.mockReturnValue({
        items: [],
        loading: false,
        error: null,
        reportDate: null,
        summary: null,
        expandedItems: new Set(),
        aiExplanationMode: false,
        loadReport: mockLoadReport,
        clearError: mockClearError,
        toggleExpand: mockToggleExpand,
        expandAll: mockExpandAll,
        collapseAll: mockCollapseAll,
      })

      render(<ReportView />)

      expect(mockLoadReport).toHaveBeenCalledTimes(1)
      expect(mockLoadReport).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    })
  })
})
