# Research: User Interaction System

**Feature**: 002-user-interaction-system
**Date**: 2026-02-28
**Status**: Phase 0 Research - Technical Decisions

## Overview

This document consolidates research findings and technical decisions for implementing the user interaction system in mailCopilot. All decisions align with the constitution (v1.3.0) and technical architecture (v2.7).

---

## 1. Email Client Auto-Detection Strategy

### Research Question
How to auto-detect Thunderbird, Outlook, and Apple Mail installation paths across Windows, macOS, and Linux?

### Decision

**Approach**: Platform-specific default path detection with registry/manifest file fallback

**Implementation Strategy**:

```typescript
// src/main/onboarding/EmailClientDetector.ts
interface EmailClient {
  type: 'thunderbird' | 'outlook' | 'apple-mail'
  name: string
  defaultPaths: Record<PlatformType, string[]>
  detectionMethod: 'path' | 'registry' | 'plist'
}

const PLATFORM_DEFAULTS: Record<PlatformType, EmailClient[]> = {
  win32: [
    {
      type: 'thunderbird',
      name: 'Mozilla Thunderbird',
      defaultPaths: [
        'C:\\Program Files\\Mozilla Thunderbird\\thunderbird.exe',
        'C:\\Program Files (x86)\\Mozilla Thunderbird\\thunderbird.exe',
        `${process.env.LOCALAPPDATA}\\Mozilla Thunderbird`
      ],
      detectionMethod: 'registry'
    },
    {
      type: 'outlook',
      name: 'Microsoft Outlook',
      defaultPaths: [
        'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE',
        'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE'
      ],
      detectionMethod: 'registry'
    }
  ],
  darwin: [
    {
      type: 'thunderbird',
      name: 'Mozilla Thunderbird',
      defaultPaths: ['/Applications/Thunderbird.app'],
      detectionMethod: 'path'
    },
    {
      type: 'apple-mail',
      name: 'Apple Mail',
      defaultPaths: ['/System/Library/Frameworks/Email.framework'],
      detectionMethod: 'plist'
    }
  ],
  linux: [
    {
      type: 'thunderbird',
      name: 'Mozilla Thunderbird',
      defaultPaths: ['/usr/bin/thunderbird', '/usr/lib/thunderbird'],
      detectionMethod: 'path'
    }
  ]
}
```

**Detection Logic**:
1. Check default paths in priority order
2. For Windows: Query registry keys (`HKEY_CURRENT_USER\\Software\\Mozilla Thunderbird`, `HKEY_CURRENT_USER\\Software\\Microsoft\\Office`)
3. For macOS: Check `/Applications/` and `~/Library/Application Support/`
4. Validate detected paths contain email files (`.msf`, `.mbox`, `.pst` files)
5. Return first valid path or null if none found

**User Workflow**:
- User selects email client type from radio buttons (Thunderbird/Outlook/Apple Mail)
- System auto-detects path and displays with "检测到: [path]"
- User can click "修改路径" to manually select directory
- Path validation: Must exist, contain email files, be readable

**Error Handling**:
- Detection failure: "未检测到，请手动选择"
- Invalid path: "路径无效，请检查后重试"
- No email files found: "该路径下未找到邮件文件"

### Rationale

- **Platform-specific paths**: Most reliable method, matches constitution's single-device binding
- **Registry/plist fallback**: Provides better detection on Windows/macOS
- **Manual override**: Ensures users can configure regardless of detection success

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| File search across entire filesystem | Most comprehensive | Too slow, privacy concerns | Performance and privacy issues |
| Environment variables | Simple | Not reliable across platforms | Users rarely configure these |
| Only manual selection | No detection complexity | Poor UX | Detection improves first-time experience |

---

## 2. Desktop Notification Implementation

### Research Question
How to implement desktop notifications with do-not-disturb mode and notification aggregation?

### Decision

**Approach**: Electron Notification API with custom do-not-disturb logic and in-memory aggregation

**Implementation Strategy**:

```typescript
// src/main/notifications/NotificationManager.ts
interface NotificationConfig {
  enabled: boolean
  doNotDisturb: {
    enabled: boolean
    startTime: string // HH:mm format
    endTime: string
  }
  sound: boolean
}

interface QueuedNotification {
  id: string
  type: 'normal' | 'low' | 'urgent'
  title: string
  body: string
  timestamp: number
  clickHandler?: () => void
}

class NotificationManager {
  private queue: Map<string, QueuedNotification[]> = new Map()
  private aggregationWindow = 3 * 60 * 1000 // 3 minutes

  async send(config: NotificationConfig, notification: QueuedNotification) {
    // 1. Check if notifications enabled
    if (!config.enabled) return

    // 2. Check do-not-disturb mode
    if (this.isDoNotDisturbActive(config.doNotDisturb)) {
      // Urgent notifications (errors) bypass do-not-disturb
      if (notification.type !== 'urgent') {
        return
      }
    }

    // 3. Check aggregation window
    const recent = this.getRecentNotifications(notification.type)
    if (recent.length > 0) {
      const lastNotification = recent[0]
      const timeSinceLast = Date.now() - lastNotification.timestamp

      if (timeSinceLast < this.aggregationWindow) {
        // Aggregate with existing notification
        this.aggregateNotification(lastNotification, notification)
        return
      }
    }

    // 4. Send notification
    const nativeNotification = new Notification(notification.title, {
      body: notification.body,
      icon: this.getIcon(),
      silent: !config.sound,
      timeoutType: this.getTimeoutType(notification.type)
    })

    nativeNotification.onclick = () => {
      notification.clickHandler?.()
      nativeNotification.close()
    }

    // 5. Auto-dismiss based on type
    if (notification.type !== 'urgent') {
      setTimeout(() => nativeNotification.close(), this.getTimeout(notification.type))
    }
  }

  private isDoNotDisturbActive(config: NotificationConfig['doNotDisturb']): boolean {
    if (!config.enabled) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [startHour, startMin] = config.startTime.split(':').map(Number)
    const [endHour, endMin] = config.endTime.split(':').map(Number)
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    // Handle overnight schedule (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime
    }

    return currentTime >= startTime && currentTime < endTime
  }

  private aggregateNotification(existing: QueuedNotification, new: QueuedNotification) {
    // Merge notification bodies
    existing.body = this.mergeNotificationBodies(existing.body, new.body)
    existing.timestamp = Date.now()
  }
}
```

**Notification Types**:

| Type | Duration | Interactions | Example |
|------|----------|--------------|---------|
| Normal | 5s auto-dismiss | Clickable | Report generation complete |
| Low | 3s auto-dismiss | Not clickable | Configuration updated |
| Urgent | Persistent (manual) | Clickable | LLM connection failure |

**Do-Not-Disturb Mode**:
- Time range: 22:00 - 08:00 (configurable)
- Behavior: Suppress all non-urgent notifications
- Urgent notifications (errors) bypass do-not-disturb

**Aggregation Rules**:
- Window: 3 minutes
- Merge identical notification types
- Update body text to show aggregated count

**Test Notification**:
```typescript
async sendTestNotification() {
  await this.send(currentConfig, {
    id: 'test-notification',
    type: 'normal',
    title: 'mailCopilot 通知测试',
    body: '这是一条测试通知',
    timestamp: Date.now()
  })
}
```

### Rationale

- **Electron Notification API**: Cross-platform, native look and feel
- **Do-not-disturb in-memory**: No persistence needed, resets on app restart
- **Aggregation window**: Reduces notification spam without complex state management
- **Urgent bypass**: Ensures critical errors are never suppressed

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| node-notifier | More features | Extra dependency, native-only | Electron API sufficient |
| Platform-specific APIs (Windows 10 Toast, macOS Notification Center) | Rich features | Complex implementation | Cross-platform complexity not worth it |
| Persistent aggregation queue | Survive app restart | Complex state, privacy concerns | In-memory sufficient, simpler |

---

## 3. Inline Editing State Management (P2 Feature)

### Research Question
Best practices for inline editing with auto-save in React/Zustand?

### Decision

**Approach**: Optimistic UI updates with debounced auto-save (1 second) + visual feedback

**Implementation Strategy**:

```typescript
// src/renderer/hooks/useInlineEdit.ts
interface UseInlineEditOptions<T> {
  initialValue: T
  validate: (value: T) => string | null
  onSave: (value: T) => Promise<void>
  debounceMs?: number
}

function useInlineEdit<T>({
  initialValue,
  validate,
  onSave,
  debounceMs = 1000
}: UseInlineEditOptions<T>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(initialValue)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Debounced save using useTransition
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  const startEdit = useCallback(() => {
    setIsEditing(true)
    setEditValue(initialValue)
  }, [initialValue])

  const handleChange = useCallback((value: T) => {
    setEditValue(value)

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Validate immediately
    const error = validate(value)
    setValidationError(error)

    // Debounced save if valid
    if (!error) {
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true)
        try {
          await onSave(value)
          // Show success animation
        } catch (err) {
          setValidationError(err.message)
        } finally {
          setIsSaving(false)
        }
      }, debounceMs)
    }
  }, [validate, onSave, debounceMs])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditValue(initialValue)
    setValidationError(null)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [initialValue])

  return {
    isEditing,
    editValue,
    validationError,
    isSaving,
    startEdit,
    handleChange,
    cancelEdit
  }
}
```

**Visual Feedback**:
- Editing state: Light blue background (#EFF6FF), blue border (#4F46E5)
- Saving state: Spinner or progress indicator
- Success: Green checkmark animation (300ms)
- Error: Shake animation + red error message

**Validation Rules** (from spec):
- Title: Non-empty, max 200 characters
- Due date: Valid date format
- Description: Max 500 characters
- Priority: High/Medium/Low enum

**Auto-Save Behavior**:
- 1 second debounce after last change
- Save on blur (field loses focus)
- Cancel on Escape key

### Rationale

- **Optimistic UI**: Updates appear immediately, better perceived performance
- **Debounced save**: Reduces database writes, respects constitution's performance goals
- **Validation-first**: Prevents invalid data from being saved
- **Visual feedback**: Clear indication of edit state, saving, success/error

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| Save button (explicit) | User control | More clicks, slower UX | Spec requires auto-save |
| Validation-only on save | Simpler | Late error feedback | Poor UX, violates spec |
| No debounce | Simpler | Excessive database writes | Performance concern |

---

## 4. Search Performance Optimization

### Research Question
SQLite FTS5 vs LIKE queries for searching 10k+ historical items?

### Decision

**Approach**: SQLite FTS5 (full-text search) with optimized indexes for title, description, and metadata

**Implementation Strategy**:

```sql
-- Create FTS5 virtual table for todo_items
CREATE VIRTUAL TABLE todo_items_fts USING fts5(
  item_id UNINDEXED,
  content,
  tags,
  evidence_text,
  content='todo_items',
  content_rowid='rowid'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER todo_items_ai AFTER INSERT ON todo_items BEGIN
  INSERT INTO todo_items_fts(rowid, item_id, content, tags)
  VALUES (new.rowid, new.item_id, json_extract(new.content_encrypted, '$'), new.tags);
END;

CREATE TRIGGER todo_items_ad AFTER DELETE ON todo_items BEGIN
  DELETE FROM todo_items_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER todo_items_au AFTER UPDATE ON todo_items BEGIN
  UPDATE todo_items_fts
  SET content = json_extract(new.content_encrypted, '$'),
      tags = new.tags
  WHERE rowid = new.rowid;
END;

-- Optimized search query
SELECT
  ti.item_id,
  ti.content_encrypted,
  ti.confidence_score,
  ti.source_status,
  ti.report_date,
  rank
FROM todo_items_fts fts
JOIN todo_items ti ON ti.rowid = fts.rowid
WHERE todo_items_fts MATCH $query
  AND ti.report_date BETWEEN $startDate AND $endDate
ORDER BY rank
LIMIT 20 OFFSET $offset;
```

**Search Features**:
- Full-text search across item content, tags, evidence
- BM25 ranking for relevance
- Support boolean operators (AND, OR, NOT)
- Highlight matching keywords in UI

**Performance Optimizations**:
- Pagination: 20 items per page
- Debounced search input: 300ms
- Indexes on report_date, item_type, source_status
- Caching: Store recent search results in memory (Zustand)

**Query Examples**:
```typescript
// Simple keyword search
"王总监 预算" → MATCH '"王总监" "预算"'

// Boolean search
"王总监 AND 预算" → MATCH '"王总监" "预算"'
"王总监 OR 预算" → MATCH '"王总监" OR "预算"'
"王总监 NOT 预算" → MATCH '"王总监" NOT "预算"'

// Phrase search
'"王总监 预算审批"' → MATCH '"王总监 预算审批"'
```

### Rationale

- **FTS5**: Native SQLite full-text search, no external dependencies
- **BM25 ranking**: Provides relevance scoring, better than LIKE
- **Triggers**: Automatic synchronization, no manual index updates
- **Pagination**: Reduces query time, meets spec (<1 second for 10k items)
- **Debouncing**: Reduces unnecessary queries during typing

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| LIKE queries | Simple | Slow on large datasets (10000+ items), no ranking | Performance doesn't meet spec |
| External search engine (Elasticsearch, Typesense) | Powerful | Heavy dependency, overkill for desktop app | Constitution prefers minimal dependencies |
| In-memory search | Fast | Data lost on restart, no persistence | Constitution requires device-bound storage |

---

## 5. Calendar Component Selection

### Research Question
shadcn/ui calendar vs custom implementation for displaying reports with blue-dot indicators?

### Decision

**Approach**: Extend shadcn/ui Calendar component with custom rendering for blue-dot indicators

**Implementation Strategy**:

```typescript
// src/renderer/components/history/CalendarView.tsx
import { Calendar } from '@/shared/components/ui/calendar'
import { DayContent } from '@/shared/components/ui/calendar'

interface ReportCalendarProps {
  reports: Map<string, DailyReport> // date -> report
  selectedDate: Date | undefined
  onDateSelect: (date: Date) => void
}

function ReportCalendar({ reports, selectedDate, onDateSelect }: ReportCalendarProps) {
  // Transform reports to Set of dates with reports
  const reportDates = useMemo(() => {
    return new Set(
      Array.from(reports.keys()).map(dateStr => new Date(dateStr))
    )
  }, [reports])

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onDateSelect}
      components={{
        DayContent: (props) => (
          <ReportDayContent
            {...props}
            hasReport={reportDates.has(props.date)}
            reportCount={reports.get(format(props.date, 'yyyy-MM-dd'))?.itemCount || 0}
          />
        )
      }}
      className="rounded-md border"
    />
  )
}

function ReportDayContent({ date, hasReport, reportCount }: DayContentProps & { hasReport: boolean; reportCount: number }) {
  return (
    <div className="relative h-9 w-9 p-0">
      <DayContent date={date} />
      {hasReport && (
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-blue-500"
          title={`${reportCount} 个事项`}
        />
      )}
    </div>
  )
}
```

**Blue-Dot Indicators**:
- Size: 6px diameter (rounded-full)
- Color: Blue-500 (#3B82F6)
- Position: Bottom-center of day cell
- Tooltip: "X 个事项" (X items)
- Multiple reports on same date: Single dot with total count

**Date Selection**:
- Click date → Load report for that date
- Selected date: Highlighted with border
- Today: Default highlight (shadcn/ui built-in)

**Navigation**:
- Month navigation: Built-in shadcn/ui arrows
- Jump to today: "今天" button
- Quick jump: Month/year dropdown (built-in)

### Rationale

- **shadcn/ui Calendar**: Reusable component, accessible, keyboard navigation
- **Custom DayContent**: Extensible with custom rendering
- **Blue-dot indicators**: Simple visual pattern, meets spec requirements
- **Minimal dependencies**: No extra libraries, uses existing shadcn/ui

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| FullCalendar | Powerful | Heavy (600KB+), overkill | Too large for desktop app |
| react-calendar | Lightweight | Less customizable, less accessible | shadcn/ui provides better base |
| Custom calendar from scratch | Full control | Time-consuming, accessibility burden | Reuse existing component |

---

## 6. Progress Dialog Updates from Main Process

### Research Question
IPC patterns for real-time progress updates during long-running report generation?

### Decision

**Approach**: Event-based IPC using `ipcRenderer.on` listener + main process `webContents.send` events

**Implementation Strategy**:

```typescript
// Main process: src/main/llm/ReportGenerator.ts
class ReportGenerator {
  private mainWindow: BrowserWindow

  async generateReport(config: ReportConfig): Promise<void> {
    const emails = await this.fetchEmails()
    const total = emails.length

    for (let i = 0; i < total; i++) {
      // Process email
      await this.processEmail(emails[i])

      // Send progress update
      this.mainWindow.webContents.send('generation:progress', {
        stage: 'processing',
        current: i + 1,
        total: total,
        percentage: Math.round(((i + 1) / total) * 100),
        subject: emails[i].subject
      })
    }

    // Send completion
    this.mainWindow.webContents.send('generation:complete', {
      totalEmails: total,
      completedItems: stats.completed,
      pendingItems: stats.pending,
      reviewCount: stats.needsReview
    })
  }
}

// Renderer process: src/renderer/components/generation/ProgressDialog.tsx
function ProgressDialog() {
  const [progress, setProgress] = useState({
    stage: 'idle' as 'idle' | 'confirming' | 'processing' | 'complete' | 'error',
    current: 0,
    total: 0,
    percentage: 0,
    subject: ''
  })

  useEffect(() => {
    // Listen for progress updates
    const listener = (_event: ElectronIPCEvent, data: ProgressUpdate) => {
      setProgress(data)
    }

    window.electron.ipcRenderer.on('generation:progress', listener)
    window.electron.ipcRenderer.on('generation:complete', (_event, result) => {
      setProgress(prev => ({ ...prev, stage: 'complete', ...result }))
    })

    return () => {
      window.electron.ipcRenderer.removeListener('generation:progress', listener)
    }
  }, [])

  return (
    <Dialog open={progress.stage !== 'idle'}>
      <DialogContent>
        {progress.stage === 'processing' && (
          <>
            <h3>正在生成报告...</h3>
            <Progress value={progress.percentage} />
            <p>已处理: {progress.current} / {progress.total} 封邮件</p>
            <p>当前: {progress.subject}</p>
            <Button onClick={handleCancel}>取消</Button>
          </>
        )}
        {progress.stage === 'complete' && <CompletionDialog result={progress} />}
      </DialogContent>
    </Dialog>
  )
}
```

**IPC Channel Contract**:
```typescript
// Shared schema
const ProgressUpdateSchema = z.object({
  stage: z.enum(['processing', 'complete', 'error']),
  current: z.number(),
  total: z.number(),
  percentage: z.number().min(0).max(100),
  subject: z.string()
})

// IPC handlers (main process)
ipcMain.on('generation:start', async (event) => {
  const generator = new ReportGenerator(event.sender)
  await generator.generateReport(config)
})

ipcMain.on('generation:cancel', async () => {
  ReportGenerator.cancel()
})
```

**Progress Update Frequency**:
- Email processing: Update after each email
- Batch processing (50 emails): Update after each batch
- Throttle: Max 10 updates/second to avoid UI flooding

**Cancellation**:
- Main process checks `isCancelled` flag between emails
- Renderer sends 'generation:cancel' on cancel button click
- Graceful shutdown: Finish current email, then stop

### Rationale

- **Event-based**: Real-time updates without polling overhead
- **Simple API**: Single event type, payload contains all progress data
- **Unidirectional**: Main → renderer flow, avoids bidirectional complexity
- **Cancellable**: Clean cancellation with flag check between emails

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| Polling (renderer queries main) | Simple | High overhead, delayed updates | Doesn't meet spec (<300ms responsiveness) |
| WebSockets | Real-time bidirectional | Complex setup, overkill | IPC sufficient for same-process communication |
| Shared state via file | Persistent | Slow (disk I/O), race conditions | Constitution prefers in-memory state |

---

## Summary

All research questions resolved with technology decisions that align with constitution and technical architecture. Key outcomes:

1. **Email Client Detection**: Platform-specific paths with registry/plist fallback
2. **Desktop Notifications**: Electron API with do-not-disturb and 3-minute aggregation
3. **Inline Editing**: Optimistic UI with debounced auto-save (1 second)
4. **Search Performance**: SQLite FTS5 with optimized indexes and pagination
5. **Calendar View**: Extended shadcn/ui Calendar with blue-dot indicators
6. **Progress Updates**: Event-based IPC with real-time progress streaming

**Ready for Phase 1: Design & Contracts** ✓
