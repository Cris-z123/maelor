# IPC Channels Contract

**Feature**: 002-user-interaction-system
**Date**: 2026-02-28
**Status**: Phase 1 Design - API Contracts

## Overview

This document defines all IPC channels for communication between main and renderer processes. All channels comply with the constitution's IPC whitelist (22 channels across 8 categories).

---

## IPC Channel Definitions

### Onboarding Channels (2 channels)

#### 1. `onboarding:get-status`
**Direction**: Renderer → Main
**Purpose**: Get onboarding wizard completion status and current step
**Request**: `void`
**Response**:
```typescript
interface OnboardingStatus {
  completed: boolean
  currentStep: 1 | 2 | 3
  canProceed: boolean
}
```

#### 2. `onboarding:set-step`
**Direction**: Renderer → Main
**Purpose**: Update onboarding wizard step progress
**Request**:
```typescript
interface SetStepRequest {
  step: 1 | 2 | 3
  data?: {
    // Step 1: Email client
    emailClient?: {
      type: 'thunderbird' | 'outlook' | 'apple-mail'
      path: string
    }
    // Step 2: Schedule
    schedule?: {
      generationTime: { hour: number; minute: number }
      skipWeekends: boolean
    }
    // Step 3: LLM config
    llm?: {
      mode: 'local' | 'remote'
      localEndpoint?: string
      remoteEndpoint?: string
      apiKey?: string
    }
  }
}
```
**Response**: `{ success: boolean; error?: string }`

#### 3. `onboarding:detect-email-client`
**Direction**: Renderer → Main
**Purpose**: Auto-detect email client installation path
**Request**: `{ type: 'thunderbird' | 'outlook' | 'apple-mail' }`
**Response**: `{ detectedPath: string | null; error?: string }`

#### 4. `onboarding:validate-email-path`
**Direction**: Renderer → Main
**Purpose**: Validate email client path contains email files
**Request**: `{ path: string }`
**Response**: `{ valid: boolean; message: string }`

#### 5. `onboarding:test-llm-connection`
**Direction**: Renderer → Main
**Purpose**: Test LLM API connectivity
**Request**:
```typescript
interface TestLLMRequest {
  mode: 'local' | 'remote'
  localEndpoint?: string
  remoteEndpoint?: string
  apiKey?: string
}
```
**Response**: `{ success: boolean; responseTime: number; error?: string }`

---

### Report Generation Channels (3 channels)

#### 6. `generation:start`
**Direction**: Renderer → Main
**Purpose**: Start manual report generation
**Request**: `void`
**Response**: `{ success: boolean; emailCount?: number; error?: string }`

#### 7. `generation:cancel`
**Direction**: Renderer → Main
**Purpose**: Cancel in-progress report generation
**Request**: `void`
**Response**: `{ success: boolean; message: string }`

#### 8. `generation:get-progress`
**Direction**: Main → Renderer (event stream)
**Purpose**: Real-time progress updates during generation
**Event Data**:
```typescript
interface GenerationProgress {
  stage: 'processing' | 'complete' | 'error'
  current: number              // Emails processed
  total: number               // Total emails
  percentage: number          // 0-100
  subject: string             // Current email subject
}
```

---

### Reports Channels (5 channels)

#### 9. `reports:get-today`
**Direction**: Renderer → Main
**Purpose**: Get today's daily report
**Request**: `void`
**Response**:
```typescript
interface TodayReport {
  date: string                // YYYY-MM-DD
  summary: {
    totalEmails: number
    completedItems: number
    pendingItems: number
    reviewCount: number        // Items needing review
  }
  items: ReportDisplayItem[]
}
```

#### 10. `reports:get-by-date`
**Direction**: Renderer → Main
**Purpose**: Get report for specific date
**Request**: `{ date: string }  // YYYY-MM-DD`
**Response**: `TodayReport` (same structure as above)

#### 11. `reports:search`
**Direction**: Renderer → Main
**Purpose**: Search historical reports
**Request**:
```typescript
interface SearchRequest {
  keywords: string
  dateRange: {
    type: 'all' | 'today' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'custom'
    startDate?: string
    endDate?: string
  }
  filters: {
    itemTypes?: ('completed' | 'pending')[]
    confidenceLevels?: ('high' | 'medium' | 'low')[]
    hasFeedback?: boolean
  }
  pagination: {
    page: number
    perPage: number
  }
}
```
**Response**:
```typescript
interface SearchResponse {
  items: ReportDisplayItem[]
  totalCount: number
  totalPages: number
  currentPage: number
  matchHighlights: Record<string, string[]>
}
```

#### 12. `reports:expand-item`
**Direction**: Renderer → Main
**Purpose**: Get item details with source emails
**Request**: `{ itemId: string }`
**Response**:
```typescript
interface ItemDetails extends ReportDisplayItem {
  sourceEmails: EmailMetadata[]
  extractionEvidence: string
}
```

#### 13. `reports:submit-feedback`
**Direction**: Renderer → Main
**Purpose**: Submit accuracy feedback (OK/X)
**Request**:
```typescript
interface FeedbackRequest {
  itemId: string
  type: 'accurate' | 'content_error' | 'priority_error' | 'not_actionable' | 'source_error'
}
```
**Response**: `{ success: boolean; message: string }`

#### 14. `reports:copy-search-term`
**Direction**: Renderer → Main
**Purpose**: Copy search keywords to clipboard
**Request**: `{ itemId: string }`
**Response**: `{ success: boolean; searchTerm: string }`

#### 15. `reports:inline-edit` (P2)
**Direction**: Renderer → Main
**Purpose**: Update item fields inline
**Request**:
```typescript
interface InlineEditRequest {
  itemId: string
  field: 'title' | 'description' | 'dueDate' | 'priority'
  value: any
}
```
**Response**: `{ success: boolean; error?: string }`

---

### Settings Channels (4 channels)

#### 16. `settings:get-all`
**Direction**: Renderer → Main
**Purpose**: Get all settings
**Request**: `void`
**Response**: `SettingsState`

#### 17. `settings:update`
**Direction**: Renderer → Main
**Purpose**: Update setting
**Request**:
```typescript
interface UpdateSettingsRequest {
  section: 'email' | 'schedule' | 'llm' | 'display' | 'notifications' | 'data'
  updates: Partial<SettingsState>
}
```
**Response**: `{ success: boolean; error?: string }`

#### 18. `settings:cleanup-data`
**Direction**: Renderer → Main
**Purpose**: Clean old data (30 days ago, custom range)
**Request**: `{ dateRange: string }`  // "30天前" or custom
**Response**:
```typescript
interface CleanupPreview {
  cutoffDate: string
  reportCount: number
  itemCount: number
  sizeToFree: number
}
```

#### 19. `settings:destroy-feedback`
**Direction**: Renderer → Main
**Purpose**: Delete all feedback data
**Request**: `{ confirmation: string }`  // Must be "确认删除"
**Response**: `{ success: boolean; deletedCount: number; error?: string }`

---

### Notification Channels (2 channels)

#### 20. `notifications:send-test`
**Direction**: Renderer → Main
**Purpose**: Send test notification
**Request**: `void`
**Response**: `{ success: boolean; error?: string }`

#### 21. `notifications:configure`
**Direction**: Renderer → Main
**Purpose**: Update notification settings
**Request**: `Partial<NotificationSettings>`
**Response**: `{ success: boolean; error?: string }`

---

## IPC Security Compliance

All channels comply with constitution requirements:

✅ **Whitelist Compliance**: All 21 channels documented and authorized
✅ **Data Validation**: Zod schemas on all inputs
✅ **CSP Policy**: `default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com`
✅ **Error Handling**: Graceful degradation with specific error messages
✅ **No Sensitive Data in Logs**: Structured logging excludes sensitive content

---

## Implementation Notes

### Main Process Handler Registration

```typescript
// src/main/ipc/handlers.ts
import { ipcMain } from 'electron'
import { z } from 'zod'

// Register handlers
ipcMain.handle('onboarding:get-status', handleGetOnboardingStatus)
ipcMain.handle('onboarding:set-step', handleSetStep)
// ... etc
```

### Renderer Process Client

```typescript
// src/renderer/services/ipc.ts
import { ipcRenderer } from 'electron'
import { z } from 'zod'

class IPCClient {
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return ipcRenderer.invoke('onboarding:get-status')
  }

  async setOnboardingStep(step: number, data?: any): Promise<{ success: boolean }> {
    return ipcRenderer.invoke('onboarding:set-step', { step, data })
  }

  // Listen for progress events
  onProgress(callback: (data: GenerationProgress) => void) {
    ipcRenderer.on('generation:progress', (_event, data) => callback(data))
  }
}
```

**Ready for Phase 1: UI Component Contracts** ✓
