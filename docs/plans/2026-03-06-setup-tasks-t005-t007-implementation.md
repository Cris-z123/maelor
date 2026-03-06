# Setup Tasks T005-T007 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build foundational infrastructure for user interaction system by extending IPC client, refining type definitions, and configuring custom theme.

**Architecture:** Three parallel independent tasks - IPC client extension (T005), type definition refinement (T006), and theme configuration (T007). All tasks follow existing patterns and maintain backward compatibility.

**Tech Stack:** TypeScript 5.4, Electron 29.4.6, Tailwind CSS v3.4, shadcn/ui, IPC communication pattern, CSS custom properties

---

## Task 1: T005 - Extend IPC Client with Onboarding Channels

**Files:**
- Modify: `src/renderer/services/ipc.ts` (add 5 onboarding methods)
- Test: `tests/unit/renderer/services/ipc.test.ts` (create test file)

**Step 1: Write failing test for onboarding get-status**

```typescript
// tests/unit/renderer/services/ipc.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipcClient } from '@/services/ipc';

describe('IPCClient - Onboarding Channels', () => {
  beforeEach(() => {
    // Mock window.electronAPI
    global.window = {
      electronAPI: {
        onboarding: {
          getStatus: vi.fn().mockResolvedValue({
            completed: false,
            currentStep: 1,
            canProceed: true
          })
        },
        // ... other mock methods
      }
    } as any;
  });

  describe('getOnboardingStatus', () => {
    it('should return onboarding status', async () => {
      const status = await ipcClient.getOnboardingStatus();

      expect(status).toEqual({
        completed: false,
        currentStep: 1,
        canProceed: true
      });
    });

    it('should handle IPC errors gracefully', async () => {
      (window.electronAPI.onboarding.getStatus as any).mockRejectedValue(
        new Error('IPC channel failed')
      );

      await expect(ipcClient.getOnboardingStatus()).rejects.toThrow(
        'Onboarding get-status failed: IPC channel failed'
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: FAIL - "getOnboardingStatus is not a function"

**Step 3: Implement getOnboardingStatus method**

Add to `src/renderer/services/ipc.ts` IPCClient class:

```typescript
// =============================================================================
// Onboarding Operations
// =============================================================================

/**
 * Get onboarding wizard status
 * Channel: onboarding:get-status
 */
async getOnboardingStatus(): Promise<{
  completed: boolean;
  currentStep: 1 | 2 | 3;
  canProceed: boolean;
}> {
  try {
    const response = await this.api.onboarding.getStatus();
    return response;
  } catch (error) {
    console.error('[IPC] Onboarding get-status failed:', error);
    throw new Error(`Onboarding get-status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/services/ipc.ts tests/unit/renderer/services/ipc.test.ts
git commit -m "feat(T005): add getOnboardingStatus IPC method"
```

---

## Task 2: T005 - Add Remaining Onboarding Methods

**Files:**
- Modify: `src/renderer/services/ipc.ts`
- Test: `tests/unit/renderer/services/ipc.test.ts`

**Step 1: Write failing tests for setOnboardingStep**

```typescript
describe('setOnboardingStep', () => {
  it('should update onboarding step with data', async () => {
    const mockData = {
      emailClient: { type: 'thunderbird' as const, path: '/path/to/thunderbird' }
    };

    (window.electronAPI.onboarding.setStep as any).mockResolvedValue({
      success: true
    });

    const result = await ipcClient.setOnboardingStep(1, mockData);

    expect(result).toEqual({ success: true });
    expect(window.electronAPI.onboarding.setStep).toHaveBeenCalledWith({
      step: 1,
      data: mockData
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: FAIL - "setOnboardingStep is not a function"

**Step 3: Implement setOnboardingStep**

```typescript
/**
 * Update onboarding wizard step progress
 * Channel: onboarding:set-step
 */
async setOnboardingStep(
  step: 1 | 2 | 3,
  data?: {
    emailClient?: { type: 'thunderbird' | 'outlook' | 'apple-mail'; path: string };
    schedule?: { generationTime: { hour: number; minute: number }; skipWeekends: boolean };
    llm?: {
      mode: 'local' | 'remote';
      localEndpoint?: string;
      remoteEndpoint?: string;
      apiKey?: string;
    };
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await this.api.onboarding.setStep({ step, data });
    return response;
  } catch (error) {
    console.error('[IPC] Onboarding set-step failed:', error);
    throw new Error(`Onboarding set-step failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/services/ipc.ts tests/unit/renderer/services/ipc.test.ts
git commit -m "feat(T005): add setOnboardingStep IPC method"
```

**Step 6: Repeat pattern for remaining 3 onboarding methods**

Follow same TDD pattern for:
- `detectEmailClient(type)`
- `validateEmailPath(path)`
- `testLLMConnection(config)`

Each commit: `feat(T005): add <method-name> IPC method`

---

## Task 3: T005 - Add Generation Channel Methods

**Files:**
- Modify: `src/renderer/services/ipc.ts`
- Test: `tests/unit/renderer/services/ipc.test.ts`

**Step 1: Write failing test for startGeneration**

```typescript
describe('Generation Channels', () => {
  beforeEach(() => {
    (global.window as any).electronAPI = {
      ...window.electronAPI,
      generation: {
        start: vi.fn().mockResolvedValue({ success: true, emailCount: 42 }),
        cancel: vi.fn().mockResolvedValue({ success: true, message: 'Generation cancelled' })
      }
    };
  });

  describe('startGeneration', () => {
    it('should start report generation', async () => {
      const result = await ipcClient.startGeneration();

      expect(result).toEqual({ success: true, emailCount: 42 });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: FAIL

**Step 3: Implement startGeneration**

```typescript
// =============================================================================
// Generation Operations
// =============================================================================

/**
 * Start manual report generation
 * Channel: generation:start
 */
async startGeneration(): Promise<{
  success: boolean;
  emailCount?: number;
  error?: string;
}> {
  try {
    const response = await this.api.generation.start();
    return response;
  } catch (error) {
    console.error('[IPC] Generation start failed:', error);
    throw new Error(`Generation start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cancel in-progress report generation
 * Channel: generation:cancel
 */
async cancelGeneration(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await this.api.generation.cancel();
    return response;
  } catch (error) {
    console.error('[IPC] Generation cancel failed:', error);
    throw new Error(`Generation cancel failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: PASS

**Step 5: Add progress event listener with test**

```typescript
describe('onProgress', () => {
  it('should register progress event listener and return unsubscribe', () => {
    const mockCallback = vi.fn();
    const mockRemoveListener = vi.fn();

    (global.window as any).electronAPI = {
      ...window.electronAPI,
      generation: {
        ...window.electronAPI.generation,
        onProgress: (callback: any) => {
          // Simulate registration
          return mockRemoveListener;
        }
      }
    };

    const unsubscribe = ipcClient.onProgress(mockCallback);

    expect(typeof unsubscribe).toBe('function');
  });
});
```

**Step 6: Implement onProgress event listener**

Add to IPCClient class private properties:

```typescript
private progressListeners: Set<(data: any) => void> = new Set();

/**
 * Listen for generation progress events
 * Channel: generation:progress (event)
 * @returns Unsubscribe function
 */
onProgress(callback: (data: {
  stage: 'processing' | 'complete' | 'error';
  current: number;
  total: number;
  percentage: number;
  subject: string;
}) => void): () => void {
  this.progressListeners.add(callback);

  // Register with ElectronAPI
  if (this.api.generation?.onProgress) {
    this.api.generation.onProgress(callback);
  }

  // Return unsubscribe function
  return () => {
    this.progressListeners.delete(callback);
  };
}
```

**Step 7: Commit**

```bash
git add src/renderer/services/ipc.ts tests/unit/renderer/services/ipc.test.ts
git commit -m "feat(T005): add generation channel methods (start, cancel, progress)"
```

---

## Task 4: T005 - Add Reports Channel Methods

**Files:**
- Modify: `src/renderer/services/ipc.ts`
- Test: `tests/unit/renderer/services/ipc.test.ts`

**Step 1: Write failing tests for reports methods**

```typescript
describe('Reports Channels', () => {
  beforeEach(() => {
    (global.window as any).electronAPI = {
      ...window.electronAPI,
      reports: {
        getToday: vi.fn().mockResolvedValue({
          date: '2026-03-06',
          summary: { totalEmails: 100, completedItems: 5, pendingItems: 3, reviewCount: 2 },
          items: []
        }),
        getByDate: vi.fn().mockResolvedValue({
          date: '2026-03-05',
          summary: { totalEmails: 80, completedItems: 4, pendingItems: 2, reviewCount: 1 },
          items: []
        }),
        search: vi.fn().mockResolvedValue({
          items: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 1,
          matchHighlights: {}
        }),
        expandItem: vi.fn().mockResolvedValue({
          itemId: '123',
          // ... item details
        }),
        submitFeedback: vi.fn().mockResolvedValue({ success: true, message: 'Feedback submitted' }),
        copySearchTerm: vi.fn().mockResolvedValue({ success: true, searchTerm: 'from:sender subject' })
      }
    };
  });

  describe('getTodayReport', () => {
    it('should return today report', async () => {
      const report = await ipcClient.getTodayReport();

      expect(report).toHaveProperty('date');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('items');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: FAIL

**Step 3: Implement all 6 reports methods**

```typescript
// =============================================================================
// Reports Operations
// =============================================================================

/**
 * Get today's daily report
 * Channel: reports:get-today
 */
async getTodayReport(): Promise<{
  date: string;
  summary: {
    totalEmails: number;
    completedItems: number;
    pendingItems: number;
    reviewCount: number;
  };
  items: any[];
}> {
  try {
    const response = await this.api.reports.getToday();
    return response;
  } catch (error) {
    console.error('[IPC] Reports get-today failed:', error);
    throw new Error(`Reports get-today failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get report for specific date
 * Channel: reports:get-by-date
 */
async getReportByDate(date: string): Promise<any> {
  try {
    const response = await this.api.reports.getByDate({ date });
    return response;
  } catch (error) {
    console.error('[IPC] Reports get-by-date failed:', error);
    throw new Error(`Reports get-by-date failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search historical reports
 * Channel: reports:search
 */
async searchReports(request: {
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
  pagination: {
    page: number;
    perPage: number;
  };
}): Promise<{
  items: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  matchHighlights: Record<string, string[]>;
}> {
  try {
    const response = await this.api.reports.search(request);
    return response;
  } catch (error) {
    console.error('[IPC] Reports search failed:', error);
    throw new Error(`Reports search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get item details with source emails
 * Channel: reports:expand-item
 */
async expandItem(itemId: string): Promise<any> {
  try {
    const response = await this.api.reports.expandItem({ itemId });
    return response;
  } catch (error) {
    console.error('[IPC] Reports expand-item failed:', error);
    throw new Error(`Reports expand-item failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Submit accuracy feedback
 * Channel: reports:submit-feedback
 */
async submitFeedback(request: {
  itemId: string;
  type: 'accurate' | 'content_error' | 'priority_error' | 'not_actionable' | 'source_error';
}): Promise<{ success: boolean; message: string }> {
  try {
    const response = await this.api.reports.submitFeedback(request);
    return response;
  } catch (error) {
    console.error('[IPC] Reports submit-feedback failed:', error);
    throw new Error(`Reports submit-feedback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Copy search keywords to clipboard
 * Channel: reports:copy-search-term
 */
async copySearchTerm(itemId: string): Promise<{ success: boolean; searchTerm: string }> {
  try {
    const response = await this.api.reports.copySearchTerm({ itemId });
    return response;
  } catch (error) {
    console.error('[IPC] Reports copy-search-term failed:', error);
    throw new Error(`Reports copy-search-term failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/services/ipc.ts tests/unit/renderer/services/ipc.test.ts
git commit -m "feat(T005): add reports channel methods (6 methods)"
```

---

## Task 5: T005 - Add Settings and Notifications Methods

**Files:**
- Modify: `src/renderer/services/ipc.ts`
- Test: `tests/unit/renderer/services/ipc.test.ts`

**Step 1: Write failing tests for settings methods**

```typescript
describe('Settings Channels', () => {
  beforeEach(() => {
    (global.window as any).electronAPI = {
      ...window.electronAPI,
      settings: {
        getAll: vi.fn().mockResolvedValue({
          email: { type: 'thunderbird', path: '/path' },
          schedule: { generationTime: { hour: 18, minute: 0 }, skipWeekends: true },
          llm: { mode: 'remote', remoteEndpoint: 'https://api.openai.com', apiKey: 'sk-xxx' },
          notifications: { enabled: true, doNotDisturb: { enabled: true }, soundEnabled: false },
          display: { aiExplanationMode: false }
        }),
        update: vi.fn().mockResolvedValue({ success: true }),
        cleanupData: vi.fn().mockResolvedValue({
          cutoffDate: '2026-02-05',
          reportCount: 10,
          itemCount: 50,
          sizeToFree: 1024000
        }),
        destroyFeedback: vi.fn().mockResolvedValue({ success: true, deletedCount: 25 })
      }
    };
  });

  describe('getAllSettings', () => {
    it('should return all settings', async () => {
      const settings = await ipcClient.getAllSettings();

      expect(settings).toHaveProperty('email');
      expect(settings).toHaveProperty('schedule');
      expect(settings).toHaveProperty('llm');
      expect(settings).toHaveProperty('notifications');
      expect(settings).toHaveProperty('display');
    });
  });
});
```

**Step 2: Implement settings methods**

```typescript
// =============================================================================
// Settings Operations
// =============================================================================

/**
 * Get all settings
 * Channel: settings:get-all
 */
async getAllSettings(): Promise<any> {
  try {
    const response = await this.api.settings.getAll();
    return response;
  } catch (error) {
    console.error('[IPC] Settings get-all failed:', error);
    throw new Error(`Settings get-all failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update settings section
 * Channel: settings:update
 */
async updateSettings(
  section: 'email' | 'schedule' | 'llm' | 'display' | 'notifications' | 'data',
  updates: Partial<any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await this.api.settings.update({ section, updates });
    return response;
  } catch (error) {
    console.error('[IPC] Settings update failed:', error);
    throw new Error(`Settings update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean old data
 * Channel: settings:cleanup-data
 */
async cleanupData(dateRange: string): Promise<{
  cutoffDate: string;
  reportCount: number;
  itemCount: number;
  sizeToFree: number;
}> {
  try {
    const response = await this.api.settings.cleanupData({ dateRange });
    return response;
  } catch (error) {
    console.error('[IPC] Settings cleanup-data failed:', error);
    throw new Error(`Settings cleanup-data failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Destroy all feedback data
 * Channel: settings:destroy-feedback
 */
async destroyFeedback(confirmation: string): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    const response = await this.api.settings.destroyFeedback({ confirmation });
    return response;
  } catch (error) {
    console.error('[IPC] Settings destroy-feedback failed:', error);
    throw new Error(`Settings destroy-feedback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Step 3: Implement notifications methods**

```typescript
// =============================================================================
// Notifications Operations
// =============================================================================

/**
 * Send test notification
 * Channel: notifications:send-test
 */
async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await this.api.notifications.sendTest();
    return response;
  } catch (error) {
    console.error('[IPC] Notifications send-test failed:', error);
    throw new Error(`Notifications send-test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Configure notification settings
 * Channel: notifications:configure
 */
async configureNotifications(settings: Partial<{
  enabled: boolean;
  doNotDisturb: { enabled: boolean; startTime: string; endTime: string };
  soundEnabled: boolean;
}>): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await this.api.notifications.configure(settings);
    return response;
  } catch (error) {
    console.error('[IPC] Notifications configure failed:', error);
    throw new Error(`Notifications configure failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/renderer/services/ipc.test.ts`

Expected: PASS

**Step 5: Update mock API in createMockAPI method**

```typescript
private createMockAPI(): ElectronAPI {
  console.warn('[IPC] ElectronAPI not found, using mock API');
  return {
    // ... existing mock methods
    onboarding: {
      getStatus: async () => ({ completed: false, currentStep: 1, canProceed: true }),
      setStep: async () => ({ success: true }),
      detectEmailClient: async () => ({ detectedPath: null, error: 'Mock API' }),
      validateEmailPath: async () => ({ valid: false, message: 'Mock API' }),
      testLLMConnection: async () => ({ success: false, responseTime: 0, error: 'Mock API' })
    },
    generation: {
      start: async () => ({ success: false, error: 'Mock API' }),
      cancel: async () => ({ success: true, message: 'Mock API' }),
      onProgress: () => (() => {}) // Mock unsubscribe
    },
    reports: {
      getToday: async () => ({ date: '', summary: { totalEmails: 0, completedItems: 0, pendingItems: 0, reviewCount: 0 }, items: [] }),
      getByDate: async () => ({ date: '', summary: { totalEmails: 0, completedItems: 0, pendingItems: 0, reviewCount: 0 }, items: [] }),
      search: async () => ({ items: [], totalCount: 0, totalPages: 0, currentPage: 1, matchHighlights: {} }),
      expandItem: async () => ({ itemId: '', itemType: 'pending', content: { title: '', description: '', dueDate: null, priority: 'medium' }, confidence: { score: 0, level: 'low' }, sourceStatus: 'unverified', sourceEmails: [] }),
      submitFeedback: async () => ({ success: true, message: 'Mock API' }),
      copySearchTerm: async () => ({ success: true, searchTerm: '' })
    },
    settings: {
      getAll: async () => ({}),
      update: async () => ({ success: true }),
      cleanupData: async () => ({ cutoffDate: '', reportCount: 0, itemCount: 0, sizeToFree: 0 }),
      destroyFeedback: async () => ({ success: true, deletedCount: 0 })
    },
    notifications: {
      sendTest: async () => ({ success: true, error: 'Mock API' }),
      configure: async () => ({ success: true, error: 'Mock API' })
    }
  } as any;
}
```

**Step 6: Commit**

```bash
git add src/renderer/services/ipc.ts tests/unit/renderer/services/ipc.test.ts
git commit -m "feat(T005): add settings and notifications channel methods"
```

---

## Task 6: T006 - Refine Settings Type Definitions

**Files:**
- Modify: `src/shared/types/settings.ts`
- Test: TypeScript compilation check

**Step 1: Update settings.ts to import from onboarding**

```typescript
/**
 * Settings management types
 * Per data-model.md section 6
 */

import { EmailClientConfig, ScheduleConfig, LLMConfig } from './onboarding';

export interface NotificationSettings {
  enabled: boolean;
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  soundEnabled: boolean;
}

export interface DisplaySettings {
  aiExplanationMode: boolean;
}

export interface DataManagementSettings {
  retentionPeriods: {
    reports: number; // days
    emails: number; // days
  };
  cleanupPreview: {
    cutoffDate: string;
    reportCount: number;
    itemCount: number;
    sizeToFree: number; // bytes
  } | null;
}

export type SettingsSection =
  | 'email'
  | 'schedule'
  | 'llm'
  | 'display'
  | 'notifications'
  | 'data';

export interface UpdateSettingsRequest {
  section: SettingsSection;
  updates: Partial<AllSettings>;
}

export interface AllSettings {
  email: EmailClientConfig;
  schedule: ScheduleConfig;
  llm: LLMConfig;
  notifications: NotificationSettings;
  display: DisplaySettings;
  data?: DataManagementSettings;
}
```

**Step 2: Verify index.ts re-exports**

Check `src/shared/types/index.ts`:

```typescript
export * from './onboarding';
export * from './reports';
export * from './history';
export * from './settings';
```

**Step 3: Run TypeScript compilation check**

Run: `pnpm run typecheck` (or `npx tsc --noEmit`)

Expected: No type errors, zero `any` types in settings

**Step 4: Commit**

```bash
git add src/shared/types/settings.ts
git commit -m "feat(T006): refine settings type definitions, eliminate 'any' types"
```

---

## Task 7: T007 - Configure Custom Theme Colors

**Files:**
- Modify: `src/renderer/styles/globals.css`
- Modify: `tailwind.config.js`
- Test: Visual inspection in browser

**Step 1: Update CSS variables in globals.css**

Replace `:root` section in `src/renderer/styles/globals.css`:

```css
@layer base {
  :root {
    /* Brand Colors (Chinese design system) */
    --primary: 243 87% 59%;        /* 智捷蓝 #4F46E5 */
    --primary-foreground: 0 0% 100%;

    --secondary: 187 92% 42%;      /* 灵动青 #06B6D4 */
    --secondary-foreground: 0 0% 100%;

    /* Semantic Colors */
    --success: 158 64% 42%;        /* 翠绿 #10B981 */
    --success-foreground: 0 0% 100%;

    --warning: 38 92% 49%;         /* 琥珀黄 #F59E0B */
    --warning-foreground: 0 0% 100%;

    --destructive: 0 72% 59%;      /* 珊瑚红 #EF4444 */
    --destructive-foreground: 0 0% 100%;

    /* Neutral Colors */
    --background: 210 40% 98%;     /* 极简灰 #F8FAFC */
    --foreground: 215 16% 15%;     /* 深岩灰 #1E293B */

    --card: 0 0% 100%;             /* 纯白 #FFFFFF */
    --card-foreground: 215 16% 15%;

    --popover: 0 0% 100%;
    --popover-foreground: 215 16% 15%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215 16% 47%; /* 中灰 #64748B */

    --accent: 210 40% 96.1%;
    --accent-foreground: 215 16% 15%;

    /* UI Colors */
    --border: 215 26% 91%;         /* 淡灰蓝 #E2E8F0 */
    --input: 215 26% 91%;
    --ring: 243 87% 59%;           /* Primary color ring */

    --disabled: 215 26% 80%;       /* 浅灰 #CBD5E1 */

    /* Special Colors */
    --low-confidence-bg: 48 100% 97%; /* #FFFBE6 */

    /* Animation timings (FR-095) */
    --duration-fast: 150ms;        /* Fast transitions */
    --duration-normal: 300ms;      /* Standard transitions */
    --duration-slow: 500ms;        /* Slow transitions */

    --radius: 0.5rem;
  }

  .dark {
    --background: 215 16% 15%;
    --foreground: 210 40% 98%;

    --card: 215 16% 15%;
    --card-foreground: 210 40% 98%;

    --popover: 215 16% 15%;
    --popover-foreground: 210 40% 98%;

    --primary: 243 87% 59%;
    --primary-foreground: 0 0% 100%;

    --secondary: 187 92% 42%;
    --secondary-foreground: 0 0% 100%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 243 87.6% 47.9%;
  }
}
```

**Step 2: Update tailwind.config.js with custom timings and colors**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        brand: {
          blue: '#4F46E5',  // 智捷蓝
          cyan: '#06B6D4',  // 灵动青
        },
        'low-confidence': '#FFFBE6',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      keyframes: {
        "accordion-down": {
          from { height: "0" },
          to { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from { height: "var(--radix-accordion-content-height)" },
          to { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Step 3: Verify theme in browser**

Run: `pnpm dev` (or your dev command)

Expected:
- Inter font loads correctly (check DevTools → Network → Fonts)
- Colors match design spec (智捷蓝, 灵动青, etc.)
- CSS variables applied to root element

**Step 4: Test contrast ratios with browser extension**

Use Chrome extension "WCAG Color Contrast Checker" or similar:
- 智捷蓝 on 纯白: 5.1:1 ✅
- 深岩灰 on 极简灰: 14.3:1 ✅
- 中灰 on 极简灰: 4.8:1 ✅

**Step 5: Commit**

```bash
git add src/renderer/styles/globals.css tailwind.config.js
git commit -m "feat(T007): configure custom theme colors (智捷蓝, 灵动青, etc.) and animation timings"
```

---

## Task 8: Final Verification and Documentation

**Files:**
- Modify: `specs/002-user-interaction-system/tasks.md`
- Create: Visual test screenshot (optional)

**Step 1: Run full test suite**

Run: `pnpm test`

Expected: All tests pass, ≥80% line coverage for IPC client

**Step 2: Run TypeScript compilation**

Run: `pnpm run typecheck`

Expected: Zero type errors, no `any` types in settings

**Step 3: Visual inspection checklist**

- [ ] Inter font loads (check DevTools Computed: font-family: "Inter")
- [ ] 智捷蓝 (#4F46E5) applied to primary buttons
- [ ] 灵动青 (#06B6D4) applied to secondary actions
- [ ] All semantic colors render correctly
- [ ] Animation timings feel right (fast: 150ms, normal: 300ms, slow: 500ms)
- [ ] WCAG AA contrast compliance verified

**Step 4: Update tasks.md to mark T005-T007 complete**

Edit `specs/002-user-interaction-system/tasks.md`:

```markdown
- [x] T005 [P] Setup IPC client abstraction layer in src/renderer/services/ipc.ts for type-safe communication
- [x] T006 [P] Create shared TypeScript type definitions in src/shared/types/{onboarding,reports,history,settings}.ts
- [x] T007 [P] Configure Inter font family and custom theme (智捷蓝 #4F46E5, etc.) in src/renderer/styles/theme.css per visual design specifications
```

**Step 5: Commit**

```bash
git add specs/002-user-interaction-system/tasks.md
git commit -m "docs(T005-T007): mark setup tasks complete"
```

**Step 6: Create summary PR (if using git flow)**

```bash
git checkout -b feat/t005-t007-setup-infrastructure
git push origin feat/t005-t007-setup-infrastructure
```

Create PR with description:
```
## Summary
Implements foundational infrastructure for user interaction system (T005-T007)

## Changes

### T005: IPC Client Extension
- ✅ Added 20 new IPC methods across 5 domains (onboarding, generation, reports, settings, notifications)
- ✅ Implemented type-safe wrappers for all 21 IPC channels
- ✅ Added event listener pattern for progress updates
- ✅ Extended mock API for development/testing
- ✅ Unit tests with ≥80% coverage

### T006: Type Definitions Refinement
- ✅ Eliminated all `any` types from settings.ts
- ✅ Imported concrete types from onboarding.ts
- ✅ Added DataManagementSettings, SettingsSection, UpdateSettingsRequest
- ✅ Re-exported all types from index.ts

### T007: Custom Theme Configuration
- ✅ Configured 智捷蓝 (#4F46E5), 灵动青 (#06B6D4), and all brand colors
- ✅ Applied HSL color format to CSS variables
- ✅ Added animation timings (150ms/300ms/500ms)
- ✅ Extended Tailwind with brand colors and custom durations
- ✅ Verified WCAG AA contrast compliance

## Testing
- Unit tests: All pass
- Type check: Zero errors
- Visual inspection: Theme renders correctly

## Next Steps
Ready for Phase 2: Foundational tasks (T008-T017)
```

---

## Execution Checklist

Use this checklist to track progress:

- [ ] Task 1: getOnboardingStatus (T005)
- [ ] Task 2: Remaining onboarding methods (T005)
- [ ] Task 3: Generation channels (T005)
- [ ] Task 4: Reports channels (T005)
- [ ] Task 5: Settings and notifications (T005)
- [ ] Task 6: Settings types refinement (T006)
- [ ] Task 7: Custom theme configuration (T007)
- [ ] Task 8: Final verification and documentation

**Estimated Total Time**: 2-3 hours

---

## Notes for Implementation

- **TDD Discipline**: Always write failing test first, then implement
- **Frequent Commits**: Commit after each method/task (small, atomic commits)
- **Type Safety**: Use TypeScript strict mode, no `any` types
- **Error Messages**: Include channel name in all error messages
- **Mock API**: Keep mock API in sync with real ElectronAPI shape
- **Color Contrast**: Verify WCAG AA compliance before final commit
- **DRY Principle**: Import types rather than duplicating definitions

**Reference Docs**:
- Design: `docs/plans/2026-03-06-setup-tasks-t005-t007-design.md`
- IPC Contract: `specs/002-user-interaction-system/contracts/ipc-channels.md`
- Type Definitions: `src/shared/types/*.ts`

**Ready for execution!** ✅
