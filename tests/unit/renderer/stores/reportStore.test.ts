/**
 * Tests for reportStore US2 enhancements
 *
 * Tests the new state management features for User Story 2:
 * - Item expansion/collapse functionality
 * - AI explanation mode toggle
 * - New selectors for filtered views
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReportStore, selectIsItemExpanded, selectCompletedItems, selectPendingItems, selectReviewCount } from '@renderer/stores/reportStore';
import type { DisplayItem } from '@shared/types';

// Mock IPC client
vi.mock('@renderer/services/ipc', () => ({
  ipcClient: {
    queryHistory: vi.fn(),
    generateItems: vi.fn(),
  },
}));

// Mock UUID
vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

// Helper to create mock DisplayItem
const createMockItem = (
  id: string,
  type: 'completed' | 'pending',
  confidence: number
): DisplayItem => ({
  id,
  item_id: `item-${id}`,
  report_date: '2026-03-09',
  content: `Test item ${id}`,
  item_type: type,
  source_status: 'verified',
  confidence_score: confidence,
  tags: [],
  created_at: Date.now(),
  sources: [],
});

describe('reportStore US2 Enhancements', () => {
  beforeEach(() => {
    // Reset store before each test
    const { reset } = useReportStore.getState();
    reset();
  });

  describe('toggleExpand', () => {
    it('should add item when not expanded', () => {
      const { result } = renderHook(() => useReportStore());

      act(() => {
        result.current.toggleExpand('item-1');
      });

      expect(result.current.expandedItems.has('item-1')).toBe(true);
    });

    it('should remove item when already expanded', () => {
      const { result } = renderHook(() => useReportStore());

      // First expand
      act(() => {
        result.current.toggleExpand('item-1');
      });
      expect(result.current.expandedItems.has('item-1')).toBe(true);

      // Then collapse
      act(() => {
        result.current.toggleExpand('item-1');
      });
      expect(result.current.expandedItems.has('item-1')).toBe(false);
    });

    it('should handle multiple items independently', () => {
      const { result } = renderHook(() => useReportStore());

      act(() => {
        result.current.toggleExpand('item-1');
        result.current.toggleExpand('item-2');
        result.current.toggleExpand('item-3');
      });

      expect(result.current.expandedItems.has('item-1')).toBe(true);
      expect(result.current.expandedItems.has('item-2')).toBe(true);
      expect(result.current.expandedItems.has('item-3')).toBe(true);

      // Collapse item-2 only
      act(() => {
        result.current.toggleExpand('item-2');
      });

      expect(result.current.expandedItems.has('item-1')).toBe(true);
      expect(result.current.expandedItems.has('item-2')).toBe(false);
      expect(result.current.expandedItems.has('item-3')).toBe(true);
    });
  });

  describe('expandAll and collapseAll', () => {
    it('should expand all items', () => {
      const { result } = renderHook(() => useReportStore());

      // Set up some items
      const mockItems = [
        createMockItem('item-1', 'completed', 0.8),
        createMockItem('item-2', 'pending', 0.5),
        createMockItem('item-3', 'completed', 0.9),
      ];

      act(() => {
        result.current.setItems(mockItems);
        result.current.expandAll();
      });

      expect(result.current.expandedItems.size).toBe(3);
      expect(result.current.expandedItems.has('item-1')).toBe(true);
      expect(result.current.expandedItems.has('item-2')).toBe(true);
      expect(result.current.expandedItems.has('item-3')).toBe(true);
    });

    it('should collapse all items', () => {
      const { result } = renderHook(() => useReportStore());

      // Set up some items and expand them
      const mockItems = [
        createMockItem('item-1', 'completed', 0.8),
        createMockItem('item-2', 'pending', 0.5),
      ];

      act(() => {
        result.current.setItems(mockItems);
        result.current.expandAll();
      });
      expect(result.current.expandedItems.size).toBe(2);

      // Now collapse all
      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.expandedItems.size).toBe(0);
    });
  });

  describe('setAiExplanationMode', () => {
    it('should update AI explanation mode', () => {
      const { result } = renderHook(() => useReportStore());

      expect(result.current.aiExplanationMode).toBe(false);

      act(() => {
        result.current.setAiExplanationMode(true);
      });

      expect(result.current.aiExplanationMode).toBe(true);

      act(() => {
        result.current.setAiExplanationMode(false);
      });

      expect(result.current.aiExplanationMode).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('selectIsItemExpanded should return correct state', () => {
      const { result } = renderHook(() => useReportStore());

      act(() => {
        result.current.toggleExpand('item-1');
      });

      expect(selectIsItemExpanded('item-1')(result.current)).toBe(true);
      expect(selectIsItemExpanded('item-2')(result.current)).toBe(false);
    });

    it('selectCompletedItems should filter by item_type', () => {
      const { result } = renderHook(() => useReportStore());

      const mockItems = [
        createMockItem('item-1', 'completed', 0.8),
        createMockItem('item-2', 'pending', 0.5),
        createMockItem('item-3', 'completed', 0.9),
      ];

      act(() => {
        result.current.setItems(mockItems);
      });

      const completed = selectCompletedItems(result.current);

      expect(completed).toHaveLength(2);
      expect(completed[0].id).toBe('item-1');
      expect(completed[1].id).toBe('item-3');
    });

    it('selectPendingItems should filter by item_type', () => {
      const { result } = renderHook(() => useReportStore());

      const mockItems = [
        createMockItem('item-1', 'completed', 0.8),
        createMockItem('item-2', 'pending', 0.5),
        createMockItem('item-3', 'completed', 0.9),
        createMockItem('item-4', 'pending', 0.7),
      ];

      act(() => {
        result.current.setItems(mockItems);
      });

      const pending = selectPendingItems(result.current);

      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe('item-2');
      expect(pending[1].id).toBe('item-4');
    });

    it('selectReviewCount should count items with confidence < 0.6', () => {
      const { result } = renderHook(() => useReportStore());

      const mockItems = [
        createMockItem('item-1', 'completed', 0.8),
        createMockItem('item-2', 'pending', 0.5),
        createMockItem('item-3', 'completed', 0.4),
        createMockItem('item-4', 'pending', 0.7),
        createMockItem('item-5', 'completed', 0.3),
      ];

      act(() => {
        result.current.setItems(mockItems);
      });

      const count = selectReviewCount(result.current);

      // Items with confidence < 0.6: item-2 (0.5), item-3 (0.4), item-5 (0.3)
      expect(count).toBe(3);
    });

    it('selectReviewCount should return 0 when no items need review', () => {
      const { result } = renderHook(() => useReportStore());

      const mockItems = [
        createMockItem('item-1', 'completed', 0.8),
        createMockItem('item-2', 'pending', 0.9),
        createMockItem('item-3', 'completed', 0.7),
      ];

      act(() => {
        result.current.setItems(mockItems);
      });

      const count = selectReviewCount(result.current);

      expect(count).toBe(0);
    });
  });

  describe('Helper action setItems', () => {
    it('should set items in store', () => {
      const { result } = renderHook(() => useReportStore());

      const mockItems = [
        createMockItem('item-1', 'completed', 0.8),
        createMockItem('item-2', 'pending', 0.5),
      ];

      act(() => {
        result.current.setItems(mockItems);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).toBe('item-1');
      expect(result.current.items[1].id).toBe('item-2');
    });
  });
});
