/**
 * Report Store
 *
 * Zustand store for managing report state in renderer process.
 * Handles loading, error states, and item management.
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { DisplayItem, ReportViewState, TodoItemWithSources } from '@shared/types';
import { ipcClient } from '@renderer/services/ipc';

/**
 * Report store interface
 */
interface ReportStore extends ReportViewState {
  // Existing actions
  loadReport: (reportDate: string) => Promise<void>;
  generateItems: (
    emails: Array<{ filePath: string; format: string }>,
    mode: 'local' | 'remote'
  ) => Promise<void>;
  clearError: () => void;
  reset: () => void;
  updateItem: (itemId: string, updates: Partial<TodoItemWithSources>) => void;
  filterByConfidence: (minConfidence: number) => void;
  filterByStatus: (status: 'verified' | 'unverified') => void;
  sortByConfidence: (order: 'asc' | 'desc') => void;

  // NEW actions for US2
  toggleExpand: (itemId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setAiExplanationMode: (enabled: boolean) => void;
  setItems: (items: DisplayItem[]) => void; // Helper for testing
}

/**
 * Initial state
 */
const initialState: ReportViewState = {
  items: [],
  loading: false,
  error: null,
  reportDate: null,
  summary: null,
  expandedItems: new Set<string>(),
  aiExplanationMode: false,
};

/**
 * Create report store
 */
export const useReportStore = create<ReportStore>((set) => ({
  ...initialState,

  /**
   * Load report from database for a specific date
   */
  loadReport: async (reportDate: string) => {
    set({ loading: true, error: null });
    try {
      const items = await ipcClient.queryHistory({
        query: 'get_items',
        params: { reportDate },
      });

      // Convert to display items with UUIDs
      const displayItems: DisplayItem[] = items.map((item) => ({
        ...item,
        id: uuidv4(),
      }));

      set({
        items: displayItems,
        reportDate,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[ReportStore] Load report failed:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load report',
      });
    }
  },

  /**
   * Generate items from email batch
   */
  generateItems: async (
    emails: Array<{ filePath: string; format: string }>,
    mode: 'local' | 'remote'
  ) => {
    set({ loading: true, error: null });
    try {
      const reportDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const response = await ipcClient.generateItems({
        emails,
        mode,
        reportDate,
      });

      if (!response.success) {
        throw new Error('LLM generation failed');
      }

      // Convert items to display items with UUIDs
      const displayItems: DisplayItem[] = response.items.map((item) => ({
        id: uuidv4(),
        item_id: uuidv4(),
        report_date: reportDate,
        content: item.content,
        item_type: item.type,
        source_status: item.source_status,
        confidence_score: item.confidence / 100, // Convert to 0-1 scale
        tags: [],
        created_at: Date.now(),
        sources: (item.source_email_indices ?? []).map((index) => ({
          email_hash: response.processed_emails[index]?.email_hash || '',
          search_string: response.processed_emails[index]?.search_string || '',
          file_path: response.processed_emails[index]?.file_path || '',
          evidence_text: item.evidence,
          confidence: item.confidence / 100,
        })),
      }));

      set({
        items: displayItems,
        reportDate,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[ReportStore] Generate items failed:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate items',
      });
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },

  /**
   * Update a specific item
   */
  updateItem: (itemId: string, updates: Partial<TodoItemWithSources>) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    }));
  },

  /**
   * Filter items by minimum confidence score
   */
  filterByConfidence: (minConfidence: number) => {
    set((state) => {
      const filtered = state.items.filter(
        (item) => item.confidence_score >= minConfidence
      );
      return { items: filtered };
    });
  },

  /**
   * Filter items by source status
   */
  filterByStatus: (status: 'verified' | 'unverified') => {
    set((state) => {
      const filtered = state.items.filter(
        (item) => item.source_status === status
      );
      return { items: filtered };
    });
  },

  /**
   * Sort items by confidence score
   */
  sortByConfidence: (order: 'asc' | 'desc') => {
    set((state) => {
      const sorted = [...state.items].sort((a, b) =>
        order === 'asc'
          ? a.confidence_score - b.confidence_score
          : b.confidence_score - a.confidence_score
      );
      return { items: sorted };
    });
  },

  /**
   * Toggle item expansion state
   */
  toggleExpand: (itemId: string) => {
    set((state) => {
      const newExpanded = new Set(state.expandedItems);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return { expandedItems: newExpanded };
    });
  },

  /**
   * Expand all items
   */
  expandAll: () => {
    set((state) => {
      const allIds = state.items.map((item) => item.id);
      return { expandedItems: new Set(allIds) };
    });
  },

  /**
   * Collapse all items
   */
  collapseAll: () => {
    set({ expandedItems: new Set() });
  },

  /**
   * Set AI explanation mode
   */
  setAiExplanationMode: (enabled: boolean) => {
    set({ aiExplanationMode: enabled });
  },

  /**
   * Set items (helper for testing)
   */
  setItems: (items: DisplayItem[]) => {
    set({ items });
  },
}));

/**
 * Selectors for derived state
 */
export const selectItems = (state: ReportStore) => state.items;
export const selectLoading = (state: ReportStore) => state.loading;
export const selectError = (state: ReportStore) => state.error;
export const selectReportDate = (state: ReportStore) => state.reportDate;
export const selectVerifiedItems = (state: ReportStore) =>
  state.items.filter((item) => item.source_status === 'verified');
export const selectUnverifiedItems = (state: ReportStore) =>
  state.items.filter((item) => item.source_status === 'unverified');
export const selectHighConfidenceItems = (state: ReportStore) =>
  state.items.filter((item) => item.confidence_score >= 0.8);
export const selectMediumConfidenceItems = (state: ReportStore) =>
  state.items.filter((item) => item.confidence_score >= 0.6 && item.confidence_score < 0.8);
export const selectLowConfidenceItems = (state: ReportStore) =>
  state.items.filter((item) => item.confidence_score < 0.6);

// NEW selectors for US2
export const selectExpandedItems = (state: ReportStore) => state.expandedItems;
export const selectIsItemExpanded = (itemId: string) => (state: ReportStore) =>
  state.expandedItems.has(itemId);
export const selectAiExplanationMode = (state: ReportStore) => state.aiExplanationMode;

// Grouped selectors for ReportView sections
export const selectCompletedItems = (state: ReportStore) =>
  state.items.filter((item) => item.item_type === 'completed');
export const selectPendingItems = (state: ReportStore) =>
  state.items.filter((item) => item.item_type === 'pending');
export const selectReviewCount = (state: ReportStore) =>
  state.items.filter((item) => item.confidence_score < 0.6).length;

export default useReportStore;
