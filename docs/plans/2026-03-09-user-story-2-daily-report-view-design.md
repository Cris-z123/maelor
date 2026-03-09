# User Story 2: View and Interact with Daily Report - Design Document

**Date:** 2026-03-09
**Tasks:** T036-T047
**Status:** Design Approved - Ready for Implementation
**Author:** Claude (Brainstorming Session)

---

## Executive Summary

This design enhances the existing mailCopilot report infrastructure to support viewing daily email reports with confidence indicators, expandable details, and AI explanation modes. The implementation builds upon completed test infrastructure (T033-T035) and enhances existing components rather than replacing them.

**Key Architectural Decisions:**
- Enhance existing components (ConfidenceSummaryBanner → SummaryBanner, ItemCard enhancement)
- Centralized state management in reportStore for expanded items, loading, errors, and display mode
- Shared utilities for search term generation (no IPC overhead)
- Single EmptyState component with variant-based rendering
- Basic accessibility (Tab, Enter, Esc, ARIA) - advanced shortcuts deferred to P2

---

## 1. Architecture Overview

### 1.1 Component Hierarchy

```
ReportView (container)
├── SummaryBanner (today's stats)
├── [Completed Section]
│   ├── Section Header (count + Expand/Collapse All)
│   └── ItemCard[] (each with expandable ItemDetails)
└── [Pending Section]
    ├── Section Header (count + Expand/Collapse All)
    └── ItemCard[] (each with expandable ItemDetails)

EmptyState (shared) renders when:
- No report exists for today (variant="no-report")
- Report has 0 items (variant="celebratory")
```

### 1.2 Data Flow

**Initial Load:**
```
User opens ReportView
  ↓
ReportView calls reportStore.loadReport(today)
  ↓
IPC call: reports:get-today (already implemented in T034)
  ↓
Main process queries database
  ↓
Returns items with DisplayItem[]
  ↓
reportStore updates items, loading=false, error=null
  ↓
Components re-render from store selectors
```

**Expand/Collapse Item:**
```
User clicks ItemCard
  ↓
ItemCard calls reportStore.toggleExpand(itemId)
  ↓
Store updates expandedItems Set
  ↓
ItemCard re-renders with new isExpanded prop
  ↓
CSS transition animates height (300ms)
```

**AI Explanation Mode Toggle:**
```
User toggles setting in SettingsView
  ↓
settingsStore.update({ display: { aiExplanationMode: true } })
  ↓
reportStore subscribes to settingsStore changes
  ↓
reportStore.setAiExplanationMode(true)
  ↓
All confidence badges re-render with numeric scores
```

---

## 2. Component Implementation Details

### 2.1 Enhanced reportStore (T036)

**File:** `src/renderer/stores/reportStore.ts`

**New State Properties:**
```typescript
interface ReportStore extends ReportViewState {
  // Existing state
  items: DisplayItem[];
  loading: boolean;
  error: string | null;
  reportDate: string | null;

  // NEW for US2
  expandedItems: Set<string>;  // Track which item IDs are expanded
  aiExplanationMode: boolean;  // Derived from settingsStore

  // NEW Actions
  toggleExpand: (itemId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setAiExplanationMode: (enabled: boolean) => void;
}
```

**New Selectors:**
```typescript
export const selectExpandedItems = (state: ReportStore) => state.expandedItems;
export const selectIsItemExpanded = (itemId: string) => (state: ReportStore) =>
  state.expandedItems.has(itemId);
export const selectAiExplanationMode = (state: ReportStore) => state.aiExplanationMode;

// Grouped selectors for ReportView sections
export const selectCompletedItems = (state: ReportStore) =>
  state.items.filter(item => item.item_type === 'completed');
export const selectPendingItems = (state: ReportStore) =>
  state.items.filter(item => item.item_type === 'pending');
export const selectReviewCount = (state: ReportStore) =>
  state.items.filter(item => item.confidence.score < 0.6).length;
```

---

### 2.2 SummaryBanner Component (T038)

**File:** `src/renderer/components/reports/SummaryBanner.tsx`

**Props:**
```typescript
interface SummaryBannerProps {
  totalEmails: number;
  reviewCount: number;  // Items with confidence < 0.6
}
```

**Template:** "今天共处理 {total} 封邮件，其中 {reviewCount} 件需要你重点关注。"

**Behavior:**
- Shows only when report exists and has items
- Displays in celebratory style when reviewCount = 0
- Uses appropriate styling (gray text for summary, blue for action items)

---

### 2.3 ItemDetails Component (T040)

**File:** `src/renderer/components/reports/ItemDetails.tsx`

**Props:**
```typescript
interface ItemDetailsProps {
  item: DisplayItem;
  aiExplanationMode: boolean;
  searchTerm: string;
  onCopy: (text: string) => Promise<boolean>;
  copied: boolean;
}
```

**Renders:**
- Extraction rationale (from `item.content`)
- Email metadata list (sender, date, subject)
- "Copy Search Term" button with confirmation state
- Confidence breakdown (only when `aiExplanationMode=true`)

**Copy Search Term:**
- Uses `SearchTermGenerator.generate(item.sourceEmails[0])`
- Calls clipboard API via `useClipboard` hook
- Shows "✓ 已复制" for 1 second on success

---

### 2.4 EmptyState Component (T041)

**File:** `src/renderer/components/shared/EmptyState.tsx`

**Props:**
```typescript
interface EmptyStateProps {
  variant: 'no-report' | 'celebratory' | 'no-results';
  icon?: string;
  title: string;
  message: string;
  submessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

**Variants:**
- `no-report`: Mailbox icon, "今日暂无报告", "Generate Now" button
- `celebratory`: Party icon, "太棒了! AI 未发现任何急需处理的杂事"
- `no-results`: Search icon, "未找到匹配的事项" (for future search feature)

---

### 2.5 CelebratoryEmptyState (T042)

**File:** `src/renderer/components/reports/CelebratoryEmptyState.tsx`

Thin wrapper around `EmptyState` with US2-specific content:

```typescript
interface CelebratoryEmptyStateProps {
  scheduledTime?: string;
}

export function CelebratoryEmptyState({ scheduledTime }: CelebratoryEmptyStateProps) {
  return (
    <EmptyState
      variant="celebratory"
      icon="🎉"
      title="太棒了！"
      message="AI 未发现任何急需处理的杂事"
      submessage="今日份的邮件已全部化解。享受你的专注时光吧！"
    />
  );
}
```

---

### 2.6 ReportView Container (T045)

**File:** `src/renderer/components/reports/ReportView.tsx`

**Structure:**
```tsx
<ReportView>
  {/* Loading state */}
  {loading && <LoadingSpinner />}

  {/* Error state */}
  {error && <ErrorBanner message={error} />}

  {/* Empty states */}
  {!loading && !report && <EmptyState variant="no-report" />}
  {!loading && report && items.length === 0 && <CelebratoryEmptyState />}

  {/* Report content */}
  {!loading && report && items.length > 0 && (
    <>
      <SummaryBanner totalEmails={23} reviewCount={2} />

      <Section title="已完成事项 (5)">
        <SectionHeader onExpandAll={expandAll} onCollapseAll={collapseAll} />
        {completedItems.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </Section>

      <Section title="待办事项 (3)">
        <SectionHeader onExpandAll={expandAll} onCollapseAll={collapseAll} />
        {pendingItems.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </Section>
    </>
  )}
</ReportView>
```

**Keyboard Navigation:**
- Tab: Focus management between interactive elements
- Enter: Toggle expand/collapse on focused ItemCard
- Esc: Close dialogs or collapse expanded items
- ARIA labels on all interactive elements

---

### 2.7 Enhanced ItemCard Integration

**Refactored ItemCard (T039 + T035):**

```typescript
interface ItemCardProps {
  item: DisplayItem;
  isExpanded: boolean;  // From store selector
  aiExplanationMode: boolean;  // From settings
  onToggleExpand: () => void;  // Store action
}

export function ItemCard({ item, isExpanded, aiExplanationMode, onToggleExpand }: ItemCardProps) {
  const searchTerm = SearchTermGenerator.generate(item.sourceEmails[0]);
  const { copy, copied } = useClipboard();

  return (
    <div className="item-card" onClick={onToggleExpand}>
      {/* Header - always visible */}
      <div className="item-header">
        <ConfidenceBadge confidence={item.confidence.score} mode={aiExplanationMode} />
        <h3>{item.content.title}</h3>
        <ExpandIcon isExpanded={isExpanded} />
      </div>

      {/* Details - extracted to separate component */}
      {isExpanded && (
        <ItemDetails
          item={item}
          aiExplanationMode={aiExplanationMode}
          searchTerm={searchTerm}
          onCopy={copy}
          copied={copied}
        />
      )}
    </div>
  );
}
```

---

### 2.8 Enhanced ConfidenceBadge

**File:** `src/renderer/components/reports/ConfidenceBadge.tsx` (refactor existing)

**Display Modes:**

| Confidence | Default Mode | AI Explanation Mode |
|------------|-------------|-------------------|
| ≥0.8 | ✓ 准确 | 置信度 0.85 (高) |
| 0.6-0.79 | ! 需复核 | 置信度 0.65 (中) |
| <0.6 | !! 需复核 | 置信度 0.45 (低) |

```typescript
interface ConfidenceBadgeProps {
  confidence: number;
  mode?: 'default' | 'ai-explanation';
}
```

---

## 3. Backend Implementation

### 3.1 IPC Handlers (T043)

**Note:** Based on architecture decisions:

- ❌ `reports:expand-item` - **NOT needed** (handled in frontend via reportStore)
- ❌ `reports:copy-search-term` - **NOT needed** (handled in frontend via shared utility)
- ✅ `reports:get-today` - **Already implemented** (T034)
- ✅ `reports:get-by-date` - **Already implemented** (T034)

The T043 task requirements are satisfied by existing T034 implementation with more efficient frontend state management.

---

### 3.2 SearchTermGenerator Utility (T046)

**File:** `src/shared/utils/SearchTermGenerator.ts`

```typescript
/**
 * SearchTermGenerator - Generate email search keywords
 * Format: from:{sender} {subject_keywords}
 */

interface EmailMetadata {
  sender: string;
  subject: string;
  date: string;
}

export class SearchTermGenerator {
  /**
   * Generate search term from email metadata
   */
  static generate(metadata: EmailMetadata): string {
    const sender = this.extractSender(metadata.sender);
    const keywords = this.extractKeywords(metadata.subject);
    return `from:${sender} ${keywords}`.trim();
  }

  private static extractSender(sender: string): string {
    const emailMatch = sender.match(/<([^@]+)@/);
    if (emailMatch) return emailMatch[1];
    return sender.replace(/['"]/g, '');
  }

  private static extractKeywords(subject: string): string {
    return subject
      .replace(/^(Re|Fwd|FW):\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
```

---

### 3.3 Clipboard Hook (T047)

**File:** `src/renderer/hooks/useClipboard.ts`

```typescript
/**
 * useClipboard - Clipboard integration with toast confirmation
 */

import { useState, useCallback } from 'react';
import { clipboard } from 'electron';

export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await clipboard.writeText(text);
      setCopied(true);

      // Clear confirmation after 1 second
      setTimeout(() => setCopied(false), 1000);

      return true;
    } catch (error) {
      console.error('[useClipboard] Copy failed:', error);
      return false;
    }
  }, []);

  return { copy, copied };
}
```

**Usage:**
```tsx
const { copy, copied } = useClipboard();

<Button onClick={() => copy(searchTerm)}>
  {copied ? '✓ 已复制' : '复制搜索词'}
</Button>
```

---

## 4. Testing Strategy

### 4.1 Test Coverage Requirements

Per constitution and tasks.md:
- **Unit tests:** ≥80% line coverage, ≥70% branch coverage
- **Tests already completed (T033-T035):**
  - ✅ Confidence classification utilities
  - ✅ Reports IPC integration
  - ✅ ItemCard expand/collapse

### 4.2 New Tests Required

**Unit Tests:**

1. **reportStore enhancements** (T036)
   - `toggleExpand` adds/removes from expandedItems Set
   - `expandAll` / `collapseAll` batch operations
   - `setAiExplanationMode` updates display mode
   - Selectors return correct derived state

2. **SearchTermGenerator** (T046)
   - `generate()` with various email formats
   - Sender extraction (email address vs name)
   - Subject keyword extraction (removes Re:, Fwd:)
   - Edge cases (empty sender, special characters)

3. **useClipboard hook** (T047)
   - `copy()` writes to clipboard
   - `copied` state sets to true then false after 1 second
   - Error handling when clipboard API fails

4. **SummaryBanner component** (T038)
   - Renders correct template with counts
   - Celebratory variant when reviewCount=0

5. **ItemDetails component** (T040)
   - Renders extraction rationale
   - Renders email metadata list
   - Copy button calls clipboard hook
   - AI explanation mode shows confidence breakdown

6. **EmptyState component** (T041)
   - Each variant renders correctly
   - Action button callback

**Integration Tests:**

7. **ReportView flow** (T045)
   - Loading report displays items
   - Expand/collapse updates store
   - Empty states render correctly
   - Keyboard navigation (Tab, Enter, Esc)

### 4.3 Test File Structure

```
tests/
├── unit/
│   ├── renderer/
│   │   ├── stores/
│   │   │   └── reportStore.test.ts  # T036
│   │   ├── components/
│   │   │   └── reports/
│   │   │       ├── SummaryBanner.test.tsx  # T038
│   │   │       ├── ItemDetails.test.tsx    # T040
│   │   │       └── EmptyState.test.tsx     # T041
│   │   └── hooks/
│   │       └── useClipboard.test.ts  # T047
│   └── shared/
│       └── utils/
│           └── SearchTermGenerator.test.ts  # T046
└── integration/
    └── renderer/
        └── ReportView.test.tsx  # T045
```

---

## 5. Implementation Checklist

### Phase 1: Utilities and State Management (Parallel Ready)
- [ ] T036: Enhance reportStore with expanded items tracking and AI explanation mode
- [ ] T046: Implement SearchTermGenerator utility
- [ ] T047: Implement useClipboard hook

### Phase 2: Components (Parallel Ready)
- [ ] T038: Create SummaryBanner component
- [ ] T040: Create ItemDetails component
- [ ] T041: Create EmptyState component
- [ ] T042: Create CelebratoryEmptyState component

### Phase 3: Integration
- [ ] T039: Enhance ItemCard to use ItemDetails and store state
- [ ] T043: Verify IPC handlers (already implemented in T034)
- [ ] T044: Implement confidence display mode switching logic
- [ ] T045: Create ReportView container with keyboard navigation

### Phase 4: Testing
- [ ] Write unit tests for all new components and utilities
- [ ] Write integration tests for ReportView
- [ ] Verify ≥80% line coverage, ≥70% branch coverage
- [ ] Manual testing of keyboard navigation

---

## 6. Design Decisions Record

### DDR-001: Frontend State vs IPC for Expansion
**Decision:** Handle item expansion state in frontend reportStore, not via IPC
**Rationale:** Faster UI response, no backend dependency for UI state, simpler implementation
**Trade-off:** Expansion state lost on app refresh (acceptable for view state)

### DDR-002: Shared Utility for Search Term Generation
**Decision:** Create SearchTermGenerator in shared utils, not as IPC handler
**Rationale:** Pure function, no file/system access needed, avoids IPC overhead, easier to test
**Trade-off:** Email metadata must be available in DisplayItem (already true)

### DDR-003: Single EmptyState Component with Variants
**Decision:** One EmptyState component with variant prop vs multiple components
**Rationale:** DRY principle, consistent structure, easier to maintain
**Trade-off:** Single component handles multiple use cases (acceptable abstraction)

### DDR-004: Basic Accessibility for MVP
**Decision:** Implement Tab, Enter, Esc, ARIA labels only - defer advanced shortcuts to P2
**Rationale:** Meets MVP requirements, reduces scope, follows design doc priorities
**Trade-off:** Power users will wait for P2 enhancements (acceptable per prioritization)

---

## 7. Open Questions

**Q1:** Should expansion state persist across app restarts?
**A:** No, treated as ephemeral view state. Can be enhanced in P2 if users request it.

**Q2:** Should AI explanation mode be per-user or global setting?
**A:** Per-user setting stored in settingsStore.display.aiExplanationMode (already planned)

**Q3:** Should we implement "Copy Search Term" as IPC or shared utility?
**A:** Shared utility (DDR-002) - approved in architecture

---

## 8. Success Criteria

Upon completion of T036-T047:

✅ Users can view today's daily report with all items displayed
✅ Items are grouped into "已完成" and "待办" sections
✅ Each item shows confidence badge with appropriate level
✅ Items can be expanded/collapsed with 300ms animation
✅ Expanded items show email metadata and "Copy Search Term" button
✅ "Copy Search Term" generates format: `from:sender keywords`
✅ Copy operation shows 1-second confirmation
✅ Empty states display correctly (no report, zero items)
✅ Summary banner shows email count and review count
✅ AI explanation mode toggle changes all confidence displays
✅ Keyboard navigation works (Tab, Enter, Esc)
✅ All tests pass with ≥80% line coverage, ≥70% branch coverage
✅ No regressions in T033-T035 functionality

---

## 9. Next Steps

1. **Review and approve this design document**
2. **Invoke writing-plans skill** to create detailed implementation plan
3. **Execute implementation** following task order in Section 5
4. **Test and validate** against success criteria
5. **Update tasks.md** to mark T036-T047 as completed

---

**Document Status:** ✅ Design Approved
**Ready for:** writing-plans skill invocation
**Estimated Implementation Time:** 6-8 hours (including tests)
