# Data Model: User Interaction System

**Feature**: 002-user-interaction-system
**Date**: 2026-02-28
**Status**: Phase 1 Design - Data Model Extensions

## Overview

This document defines the data model extensions required for the user interaction system. The system builds on the existing mailCopilot database schema defined in the technical architecture document (v2.7), adding entities and fields to support onboarding, report display, feedback, historical search, notifications, and settings management.

---

## 1. Onboarding State

### Purpose
Tracks first-time setup wizard progress through 3 steps (email client configuration, schedule settings, LLM configuration).

### Entity Definition

```typescript
// Onboarding state stored in user_config table
interface OnboardingState {
  // Completion status
  completed: boolean
  currentStep: 1 | 2 | 3

  // Step 1: Email client configuration
  emailClient: {
    type: 'thunderbird' | 'outlook' | 'apple-mail'
    path: string                // Path to email client or mail directory
    detectedPath: string | null  // Auto-detected path (if any)
    validated: boolean          // Path validation result
  }

  // Step 2: Schedule settings
  schedule: {
    generationTime: {
      hour: number              // 0-23
      minute: number            // 0-59
    }
    skipWeekends: boolean        // Skip Saturday/Sunday
  }

  // Step 3: LLM configuration
  llm: {
    mode: 'local' | 'remote'     // LLM mode
    localEndpoint: string        // Ollama endpoint (local mode)
    remoteEndpoint: string       // OpenAI-compatible API (remote mode)
    apiKey: string               // API key (encrypted, remote mode)
    connectionStatus: 'untested' | 'success' | 'failed'
  }

  // Metadata
  lastUpdated: number           // Unix timestamp
}
```

### Database Schema

```sql
-- Stored in user_config table with key 'onboarding'
INSERT INTO user_config (config_key, config_value) VALUES (
  'onboarding',
  /* Encrypted JSON */
  '{
    "completed": false,
    "currentStep": 1,
    "emailClient": {
      "type": "thunderbird",
      "path": "C:\\Users\\xxx\\Thunderbird\\Profiles",
      "detectedPath": null,
      "validated": false
    },
    "schedule": {
      "generationTime": {
        "hour": 18,
        "minute": 0
      },
      "skipWeekends": true
    },
    "llm": {
      "mode": "remote",
      "localEndpoint": "http://localhost:11434",
      "remoteEndpoint": "https://api.openai.com/v1",
      "apiKey": "sk-...",
      "connectionStatus": "untested"
    },
    "lastUpdated": 1709145600
  }'
);
```

### Validation Rules

| Field | Rule | Error Message |
|-------|------|--------------|
| `emailClient.path` | Must exist, contain email files | "路径无效或未找到邮件文件" |
| `schedule.generationTime.hour` | 0-23 | "请输入有效小时 (0-23)" |
| `schedule.generationTime.minute` | 0-59 | "请输入有效分钟 (0-59)" |
| `llm.localEndpoint` | Valid URL | "请输入有效的本地服务地址" |
| `llm.remoteEndpoint` | Valid HTTPS URL | "请输入有效的HTTPS地址" |
| `llm.apiKey` | Non-empty, min 20 chars | "API密钥不能为空且至少20字符" |

### State Transitions

```
[Start] → Step 1 (Email Client) → Step 2 (Schedule) → Step 3 (LLM) → [Complete]
              ↓                      ↓                    ↓
          [Can skip]             [Can skip]           [Must test]
```

---

## 2. Report Display Item

### Purpose
Enhanced item representation with confidence score, source status, feedback status, and inline edit state for displaying in daily reports.

### Entity Definition

```typescript
interface ReportDisplayItem {
  // Core fields (from todo_items table)
  itemId: string
  reportDate: string           // YYYY-MM-DD
  itemType: 'completed' | 'pending'
  content: {
    title: string              // Task title
    description: string        // Task description (optional)
    dueDate: string | null     // YYYY-MM-DD (optional)
    priority: 'high' | 'medium' | 'low'
  }

  // Confidence classification
  confidence: {
    score: number              // 0.0-1.0 (from todo_items.confidence_score)
    level: 'high' | 'medium' | 'low'
    // High: ≥0.8, Medium: 0.6-0.79, Low: <0.6
  }

  // Source status (from todo_items.source_status)
  sourceStatus: 'verified' | 'unverified'

  // Source emails (from item_email_refs table)
  sourceEmails: Array<{
    hash: string
    senderName: string
    senderDomain: string
    date: string               // YYYY-MM-DD HH:mm:ss
    subject: string            // Desensitized
    filePath: string
    searchKeywords: string     // "from:xxx subject:xxx date:xxx"
    evidenceText: string       // LLM extraction rationale
  }>

  // Feedback status (from todo_items.feedback_type)
  feedback: {
    submitted: boolean         // User has submitted feedback
    type: 'accurate' | 'content_error' | 'priority_error' | 'not_actionable' | 'source_error' | null
    timestamp: number | null   // Unix timestamp
  }

  // Inline edit state (in-memory only, not persisted)
  editState: {
    isEditing: boolean
    isModified: boolean         // User has made changes
    editingField: 'title' | 'description' | 'dueDate' | 'priority' | null
    originalValue: any         // Cache for cancel
    savedValue: any            // Last saved value
    validationError: string | null
    isSaving: boolean
  }

  // UI state
  ui: {
    expanded: boolean          // Details panel expanded/collapsed
    hover: boolean             // Mouse hover state
  }
}
```

### Database Schema

Core fields already exist in `todo_items` table. Extensions:

```sql
-- Existing fields used:
-- item_id, report_date, content_encrypted, content_checksum, item_type, tags
-- created_at, is_manually_edited, source_status, confidence_score, feedback_type

-- Extended fields (computed, not stored):
-- confidence.level: CASE WHEN confidence_score >= 0.8 THEN 'high'
--                        WHEN confidence_score >= 0.6 THEN 'medium'
--                        ELSE 'low' END
-- sourceEmails: JOIN with item_email_refs and processed_emails
-- feedback.submitted: feedback_type IS NOT NULL
```

### Confidence Classification Logic

```typescript
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.8) return 'high'
  if (score >= 0.6) return 'medium'
  return 'low'
}

function getConfidenceDisplay(item: ReportDisplayItem, mode: 'default' | 'ai-explanation') {
  if (mode === 'ai-explanation') {
    return {
      label: `${(item.confidence.score * 100).toFixed(0)}% 置信度`,
      level: item.confidence.level,
      score: item.confidence.score
    }
  }

  // Default mode
  if (item.confidence.level === 'high') {
    return { label: '准确', icon: '✓', color: 'green' }
  } else {
    return { label: '需复核', icon: item.confidence.level === 'medium' ? '!' : '!!', color: 'yellow' }
  }
}
```

### Visual Mapping

| Confidence | Icon | Label | Background | Border |
|------------|------|-------|------------|--------|
| High (≥0.8) | ✓ | 准确 | White | None |
| Medium (0.6-0.79) | ! | 需复核 | White | Blue left (#4F46E5) |
| Low (<0.6) | !! | 需复核 | Light yellow (#FFFBE6) | None |

### Inline Edit Validation

| Field | Validation | Max Length | Error Message |
|-------|-----------|------------|--------------|
| Title | Non-empty | 200 | "任务标题不能为空" |
| Description | Optional | 500 | N/A |
| Due Date | Valid date | N/A | "请输入有效日期" |
| Priority | Enum | N/A | N/A |

---

## 3. Notification Settings

### Purpose
Stores user preferences for desktop notifications (enabled, do-not-disturb, sound).

### Entity Definition

```typescript
interface NotificationSettings {
  enabled: boolean             // Master switch for notifications
  doNotDisturb: {
    enabled: boolean
    startTime: string         // HH:mm format (e.g., "22:00")
    endTime: string           // HH:mm format (e.g., "08:00")
  }
  sound: boolean              // Play sound on notification
  testNotification: boolean   // Trigger test notification (in-memory only)
}
```

### Database Schema

```sql
-- Stored in user_config table with key 'notifications'
INSERT INTO user_config (config_key, config_value) VALUES (
  'notifications',
  /* Encrypted JSON */
  '{
    "enabled": true,
    "doNotDisturb": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00"
    },
    "sound": true,
    "testNotification": false
  }'
);
```

### Notification Types

```typescript
type NotificationType = 'normal' | 'low' | 'urgent'

interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  timestamp: number
  clickHandler?: () => void
  timeout: number            // Auto-dismiss timeout (ms)
}

const NOTIFICATION_CONFIGS: Record<NotificationType, { timeout: number; clickable: boolean }> = {
  normal: { timeout: 5000, clickable: true },      // Report generation complete
  low: { timeout: 3000, clickable: false },        // Configuration updated
  urgent: { timeout: 0, clickable: true }          // Errors (persistent)
}
```

### Do-Not-Disturb Logic

```typescript
function isDoNotDisturbActive(settings: NotificationSettings): boolean {
  if (!settings.doNotDisturb.enabled) return false

  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  const [startHour, startMin] = settings.doNotDisturb.startTime.split(':').map(Number)
  const [endHour, endMin] = settings.doNotDisturb.endTime.split(':').map(Number)

  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin

  // Handle overnight schedule (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime
  }

  return currentTime >= startTime && currentTime < endTime
}
```

---

## 4. Search Query and Result

### Purpose
Encapsulates search parameters and results for historical report search.

### Entity Definition

```typescript
interface SearchQuery {
  keywords: string             // Search keywords (user input)
  dateRange: {
    type: 'all' | 'today' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'custom'
    startDate?: string        // YYYY-MM-DD (custom range)
    endDate?: string          // YYYY-MM-DD (custom range)
  }
  filters: {
    itemTypes?: ('completed' | 'pending')[]  // Filter by item type
    confidenceLevels?: ('high' | 'medium' | 'low')[]  // Filter by confidence
    hasFeedback?: boolean      // Filter by feedback status
  }
  pagination: {
    page: number               // 1-indexed
    perPage: number           // 20 (fixed)
  }
}

interface SearchResult {
  items: ReportDisplayItem[]
  totalCount: number
  totalPages: number
  currentPage: number
  matchHighlights: Map<string, string[]>  // item_id -> [highlighted text snippets]
}
```

### Database Query

```sql
-- FTS5 search with pagination
WITH search_results AS (
  SELECT
    ti.rowid,
    ti.item_id,
    ti.report_date,
    ti.item_type,
    ti.confidence_score,
    ti.source_status,
    ti.feedback_type,
    rank
  FROM todo_items_fts fts
  JOIN todo_items ti ON ti.rowid = fts.rowid
  WHERE todo_items_fts MATCH $keywords
    AND ti.report_date BETWEEN $startDate AND $endDate
    AND ($itemTypes IS NULL OR ti.item_type IN $itemTypes)
    AND ($confidenceLevels IS NULL OR
        CASE
          WHEN $confidenceLevels = ['high'] THEN ti.confidence_score >= 0.8
          WHEN $confidenceLevels = ['medium'] THEN ti.confidence_score >= 0.6 AND ti.confidence_score < 0.8
          WHEN $confidenceLevels = ['low'] THEN ti.confidence_score < 0.6
          ELSE TRUE
        END
       )
    AND ($hasFeedback IS NULL OR (ti.feedback_type IS NOT NULL) = $hasFeedback)
  ORDER BY rank
)
SELECT
  sr.*,
  (SELECT COUNT(*) FROM search_results) AS total_count
FROM search_results sr
LIMIT 20 OFFSET $offset;
```

### Performance Optimization

| Optimization | Implementation |
|--------------|----------------|
| **FTS5 index** | Auto-generated full-text index |
| **Date index** | `CREATE INDEX idx_emails_report ON processed_emails(report_date)` |
| **Pagination** | Limit 20 per page, use OFFSET for navigation |
| **Debouncing** | 300ms delay before executing search |
| **Caching** | Store last 10 search results in Zustand store |
| **Keyword highlighting** | Post-processing on results, not in SQL |

---

## 5. Settings UI State

### Purpose
Manages settings page UI state across multiple sections (email, schedule, LLM, display, notifications, data, about).

### Entity Definition

```typescript
interface SettingsState {
  activeSection: 'email' | 'schedule' | 'llm' | 'display' | 'notifications' | 'data' | 'about'

  // Email configuration
  email: {
    clientType: 'thunderbird' | 'outlook' | 'apple-mail'
    path: string
    detectedPath: string | null
    isValid: boolean
    validationMessage: string | null
  }

  // Schedule settings
  schedule: {
    generationTime: {
      hour: number
      minute: number
    }
    skipWeekends: boolean
  }

  // LLM configuration
  llm: {
    mode: 'local' | 'remote'
    localEndpoint: string
    remoteEndpoint: string
    apiKey: string
    connectionStatus: 'idle' | 'testing' | 'success' | 'failed'
    connectionMessage: string | null
  }

  // Display settings
  display: {
    aiExplanationMode: boolean   // Show confidence scores and technical details
  }

  // Notification settings
  notifications: NotificationSettings

  // Data management
  data: {
    totalSize: number           // Bytes
    feedbackStats: {
      total: number
      accurate: number
      errors: number
      thisMonthCorrections: number
    }
    cleanupPreview: {
      dateRange: string
      reportCount: number
      itemCount: number
      sizeToFree: number
    }
  }

  // About section
  about: {
    version: string
    updateStatus: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'
    latestVersion: string | null
    releaseNotes: string | null
    downloadProgress: number    // 0-100
  }
}
```

### Zod Validation Schemas

```typescript
import { z } from 'zod'

// Email path validation
const EmailPathSchema = z.string().refine(
  (path) => existsSync(path) && statSync(path).isDirectory(),
  { message: "路径不存在或不是目录" }
).refine(
  (path) => hasEmailFiles(path),
  { message: "该路径下未找到邮件文件" }
)

// Schedule time validation
const GenerationTimeSchema = z.object({
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59)
})

// LLM endpoint validation
const LocalEndpointSchema = z.string().url().refine(
  (url) => url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1'),
  { message: "本地服务地址必须以 http://localhost 或 http://127.0.0.1 开头" }
)

const RemoteEndpointSchema = z.string().url().refine(
  (url) => url.startsWith('https://'),
  { message: "远程服务地址必须使用 HTTPS 协议" }
)

const ApiKeySchema = z.string().min(20, "API密钥至少20个字符")

// Notification time validation
const NotDisturbTimeSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "时间格式必须是 HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "时间格式必须是 HH:mm")
})
```

---

## 6. Data Retention Configuration

### Purpose
Manages data retention periods and cleanup operations (existing feature, extended with UI).

### Entity Definition

```typescript
interface RetentionConfig {
  periods: {
    emailMetadata: number    // Days: 30, 90, 180, 365, -1 (permanent)
    reports: 'permanent'      // Reports never auto-delete
  }
  cleanupPreview: {
    cutoffDate: string        // YYYY-MM-DD
    reportCount: number
    itemCount: number
    sizeToFree: number         // Bytes
  }
}

interface CleanupOperation {
  type: 'auto' | 'manual'
  dateRange: string           // "30天前", "自定义范围"
  affectedReports: number
  affectedItems: number
  executedAt: number           // Unix timestamp
}
```

---

## 7. Feedback Data Model

### Purpose
Stores user accuracy feedback for action items (integrated into `todo_items` table per constitution v1.3.0).

### Entity Definition

```typescript
interface FeedbackRecord {
  itemId: string              // References todo_items.item_id
  type: 'accurate' | 'content_error' | 'priority_error' | 'not_actionable' | 'source_error'
  timestamp: number           // Unix timestamp
}

// Feedback statistics
interface FeedbackStats {
  total: number               // Total feedback submissions
  accurate: number            // Count of 'accurate' feedback
  errors: {
    content: number
    priority: number
    notActionable: number
    source: number
  }
  thisMonthCorrections: number  // Corrections this month
}
```

### Database Schema

```sql
-- Feedback type stored in todo_items.feedback_type (added per constitution v1.3.0)
ALTER TABLE todo_items ADD COLUMN feedback_type TEXT
  CHECK(feedback_type IN ('content_error', 'priority_error', 'not_actionable', 'source_error'));

-- Query feedback statistics
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN feedback_type = 'accurate' THEN 1 ELSE 0 END) as accurate_count,
  SUM(CASE WHEN feedback_type LIKE '%_error' OR feedback_type = 'not_actionable' THEN 1 ELSE 0 END) as error_count,
  SUM(CASE
    WHEN strftime('%Y-%m', datetime(created_at, 'unixepoch')) = strftime('%Y-%m', 'now')
    AND feedback_type NOT IN ('accurate', NULL)
    THEN 1 ELSE 0
  END) as this_month_corrections
FROM todo_items
WHERE feedback_type IS NOT NULL;
```

### Feedback Workflow

```
[Item Displayed] → [User clicks OK] → [Set feedback_type='accurate', timestamp=now]
                   → [User clicks X] → [Show error dialog]
                                      → [User selects reason] → [Set feedback_type=reason, timestamp=now]
```

---

## Summary

This data model extends the existing mailCopilot database schema with:

1. **OnboardingState** - Tracks setup wizard progress (3 steps)
2. **ReportDisplayItem** - Enhanced item with confidence, feedback, inline edit state
3. **NotificationSettings** - Desktop notification preferences
4. **SearchQuery** - Historical search parameters with filters
5. **SettingsState** - Settings page UI state across 7 sections
6. **RetentionConfig** - Data retention periods (existing feature)
7. **FeedbackRecord** - User feedback integrated into `todo_items` table

All entities align with the constitution principles:
- **Privacy-first**: No cloud sync, device-bound storage
- **Anti-hallucination**: Source tracking, confidence scoring, degradation over deletion
- **Data minimization**: Metadata-only retention, field-level encryption
- **Mode switching**: Hot mode switching support

**Ready for Phase 1: API Contracts** ✓
