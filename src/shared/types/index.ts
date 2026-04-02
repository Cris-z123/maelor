/**
 * Shared TypeScript Types
 *
 * Type definitions shared between main and renderer processes.
 * These types provide type safety across IPC boundaries.
 */

import type { Item, TodoItemWithSources, DailyReportSummary, ItemSourceRef } from '../schemas/validation.js';
import type {
  ConnectionResult,
  OnboardingStatus,
  RunDetail,
  RunSummary,
  SettingsView,
  ValidationResult,
} from './app.js';

// Re-export frequently used types from schemas
export type { Item, TodoItemWithSources, DailyReportSummary, ItemSourceRef };

/**
 * Action item display type for renderer
 */
export interface DisplayItem {
  id: string; // UUID for React keys
  item_id: string;
  report_date: string;
  content: string;
  item_type: 'completed' | 'pending';
  source_status: 'verified' | 'unverified';
  confidence_score: number;
  tags: string[];
  feedback_type?: 'content_error' | 'priority_error' | 'not_actionable' | 'source_error';
  created_at: number;
  sources: ItemSourceRef[];
}

/**
 * Report view state
 */
export interface ReportViewState {
  items: DisplayItem[];
  loading: boolean;
  error: string | null;
  reportDate: string | null;
  summary: DailyReportSummary | null;
  // US2: Item expansion state
  expandedItems: Set<string>;
  // US2: AI explanation mode toggle
  aiExplanationMode: boolean;
}

/**
 * Traceability info display type
 */
export interface TraceabilityDisplay {
  sender: string;
  date: string;
  subject: string;
  messageId?: string;
  fingerprint: string;
  filePath: string;
  searchString: string;
}

/**
 * IPC request/response types
 */
export interface IPCRequest<T = unknown> {
  channel: string;
  payload?: T;
}

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Electron API types for renderer process
 */
export interface ElectronAPI {
  llm: {
    generate: (request: {
      emails: Array<{ filePath: string; format: string }>;
      mode: 'local' | 'remote';
      reportDate: string;
    }) => Promise<{
      success: boolean;
      items: Item[];
      processed_emails: Array<{
        email_hash: string;
        search_string: string;
        file_path: string;
        extract_status: string;
      }>;
      skipped_emails: number;
      reprocessed_emails: number;
    }>;
  };
  db: {
    queryHistory: (request: {
      query: string;
      params?: Record<string, unknown>;
    }) => Promise<TodoItemWithSources[]>;
    export: (request: {
      format: 'markdown' | 'pdf';
      reportDate?: string;
      startDate?: string;
      endDate?: string;
      includeAll?: boolean;
    }) => Promise<{
      success: boolean;
      filePath: string;
      format: string;
      itemCount: number;
    }>;
  };
  config: {
    get: (keys?: string[]) => Promise<Record<string, unknown>>;
    set: (updates: Record<string, unknown>) => Promise<{
      success: boolean;
      updated: string[];
    }>;
  };
  app: {
    checkUpdate: (mode: 'auto' | 'manual') => Promise<{
      hasUpdate: boolean;
      version?: string;
      releaseNotes?: string;
      downloadUrl?: string;
    }>;
  };
  email: {
    fetchMeta: (filePath: string, format: string) => Promise<{
      success: boolean;
      metadata?: {
        from?: string;
        subject?: string;
        date?: string;
        attachmentCount?: number;
        size?: number;
        format?: string;
      };
      error?: string;
    }>;
  };
  onboarding: {
    getStatus: () => Promise<OnboardingStatus>;
    setStep: (step: 1 | 2 | 3) => Promise<{ success: boolean; error?: string }>;
    detectOutlookDir: () => Promise<{
      detectedPath: string | null;
      reason: string;
    }>;
    validateOutlookDir: (request: { directoryPath: string }) => Promise<ValidationResult>;
    testLLMConnection: (config: {
      baseUrl: string;
      apiKey: string;
      model: string;
    }) => Promise<ConnectionResult>;
    complete: (request: {
      directoryPath: string;
      baseUrl: string;
      apiKey: string;
      model: string;
    }) => Promise<{ success: boolean; error?: string }>;
  };
  runs: {
    start: () => Promise<{ success: boolean; runId: string | null; message: string }>;
    getLatest: () => Promise<RunDetail | null>;
    getById: (request: { runId: string }) => Promise<RunDetail | null>;
    listRecent: (request?: { limit?: number }) => Promise<RunSummary[]>;
  };
  generation: {
    start: () => Promise<{ success: boolean; emailCount?: number; error?: string }>;
    cancel: () => Promise<{ success: boolean; message: string }>;
    onProgress: (callback: (data: {
      stage: 'processing' | 'complete' | 'error';
      current: number;
      total: number;
      percentage: number;
      subject: string;
    }) => void) => void;
  };
  reports: {
    getToday: () => Promise<{
      date: string;
      summary: {
        totalEmails: number;
        completedItems: number;
        pendingItems: number;
        reviewCount: number;
      };
      items: any[];
    }>;
    getByDate: (request: { date: string }) => Promise<any>;
    search: (request: {
      keywords: string;
      dateRange: {
        type: 'all' | 'today' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'custom';
        startDate?: string;
        endDate?: string;
      };
      filters: {
        itemTypes?: ('completed' | 'pending')[];
        confidenceLevels?: ('high' | 'medium' | 'low')[];
        hasFeedback?: boolean;
      };
      pagination: { page: number; perPage: number };
    }) => Promise<{
      items: any[];
      totalCount: number;
      totalPages: number;
      currentPage: number;
      matchHighlights: Record<string, string[]>;
    }>;
    expandItem: (request: { itemId: string }) => Promise<any>;
    submitFeedback: (request: {
      itemId: string;
      type: 'accurate' | 'content_error' | 'priority_error' | 'not_actionable' | 'source_error';
    }) => Promise<{ success: boolean; message: string }>;
    copySearchTerm: (request: { itemId: string }) => Promise<{ success: boolean; searchTerm: string }>;
  };
  settings: {
    getAll: () => Promise<SettingsView>;
    update: (request: {
      outlookDirectory?: string;
      aiBaseUrl?: string;
      apiKey?: string;
      aiModel?: string;
    }) => Promise<{ success: boolean; error?: string }>;
    getDataSummary: () => Promise<SettingsView>;
    clearRuns: () => Promise<{ success: boolean; deletedRunCount: number }>;
    rebuildIndex: () => Promise<{ success: boolean; message: string }>;
    cleanupData: (request: { dateRange: string }) => Promise<{
      cutoffDate: string;
      reportCount: number;
      itemCount: number;
      sizeToFree: number;
    }>;
    destroyFeedback: (request: { confirmation: string }) => Promise<{
      success: boolean;
      deletedCount: number;
      error?: string;
    }>;
  };
  notifications: {
    sendTest: () => Promise<{ success: boolean; error?: string }>;
    configure: (settings: Partial<{
      enabled: boolean;
      doNotDisturb: { enabled: boolean; startTime: string; endTime: string };
      soundEnabled: boolean;
    }>) => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export default {};

export type {
  ActionItemView,
  ConnectionResult,
  EvidenceView,
  OnboardingStatus,
  RunDetail,
  RunSummary,
  SettingsView,
  ValidationFile,
  ValidationResult,
} from './app.js';
