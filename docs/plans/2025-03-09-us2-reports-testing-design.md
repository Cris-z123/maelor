# Design: US2 Test Infrastructure (T033-T035)

**Date:** 2025-03-09
**User Story:** US2 - View and Interact with Daily Report
**Tasks:** T033 (Confidence Tests), T034 (IPC Integration Tests), T035 (ItemCard Tests)
**Status:** Approved

---

## Overview

This design defines the test infrastructure for User Story 2, implementing comprehensive test coverage for confidence classification utilities, IPC channel integration, and the ItemCard component's expand/collapse functionality. The approach follows Red-Green-Refactor TDD methodology per the constitution.

## Architecture

### Design Principles

1. **TDD Approach:** All tests written first, verified to fail, then implementation follows
2. **Extend Existing Code:** Augment `ConfidenceThresholds.ts` rather than create duplicates
3. **CSS-Based Animations:** Use Tailwind transitions for 300ms animations (no JS libraries)
4. **Chinese Labels:** Per spec - ✓准确, !需复核, !!需复核
5. **Fail-Safe Defaults:** Invalid inputs return safe defaults, never throw exceptions

### Component Relationships

```
ConfidenceThresholds (static methods)
  ├─ getConfidenceLevel(score: number) → 'high' | 'medium' | 'low'
  └─ getConfidenceDisplay(score: number) → { label: string, level: string }

ItemCard (component)
  ├─ Props: item, isExpanded, onToggleExpand
  ├─ Uses: getConfidenceDisplay for badge
  └─ Features: expand/collapse (300ms CSS transition)

IPC Handlers (integration)
  ├─ reports:get-today → Query today's report
  ├─ reports:get-by-date → Query specific date
  ├─ reports:expand-item → Update expansion state
  └─ reports:copy-search-term → Clipboard integration
```

## T033: Confidence Classification Tests

### File: `tests/unit/shared/reports/confidence.test.ts`

### Implementation Changes

Extend `src/shared/utils/ConfidenceThresholds.ts` with:

```typescript
class ConfidenceThresholds {
  // Existing methods...

  /**
   * Classify confidence score into level
   * @param score - Confidence score (0-1)
   * @returns 'high' if ≥0.8, 'medium' if 0.6-0.79, 'low' if <0.6
   */
  static getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (isNaN(score) || score < 0 || score > 1) {
      return 'low';
    }
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Get display label and level for confidence score
   * @param score - Confidence score (0-1)
   * @returns Object with label (Chinese) and level
   */
  static getConfidenceDisplay(score: number): {
    label: string;
    level: 'high' | 'medium' | 'low';
  } {
    const level = this.getConfidenceLevel(score);
    const labels = {
      high: '✓准确',
      medium: '!需复核',
      low: '!!需复核'
    };
    return { label: labels[level], level };
  }
}
```

### Test Scenarios

#### Happy Path Tests
```typescript
describe('getConfidenceLevel', () => {
  it('returns "high" for scores ≥0.8', () => {
    expect(ConfidenceThresholds.getConfidenceLevel(0.8)).toBe('high');
    expect(ConfidenceThresholds.getConfidenceLevel(0.9)).toBe('high');
    expect(ConfidenceThresholds.getConfidenceLevel(1.0)).toBe('high');
  });

  it('returns "medium" for scores 0.6-0.79', () => {
    expect(ConfidenceThresholds.getConfidenceLevel(0.6)).toBe('medium');
    expect(ConfidenceThresholds.getConfidenceLevel(0.7)).toBe('medium');
    expect(ConfidenceThresholds.getConfidenceLevel(0.79)).toBe('medium');
  });

  it('returns "low" for scores <0.6', () => {
    expect(ConfidenceThresholds.getConfidenceLevel(0.5)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(0.0)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(0.59)).toBe('low');
  });
});

describe('getConfidenceDisplay', () => {
  it('returns correct badge labels in Chinese', () => {
    expect(ConfidenceThresholds.getConfidenceDisplay(0.8)).toEqual({
      label: '✓准确',
      level: 'high'
    });
    expect(ConfidenceThresholds.getConfidenceDisplay(0.7)).toEqual({
      label: '!需复核',
      level: 'medium'
    });
    expect(ConfidenceThresholds.getConfidenceDisplay(0.5)).toEqual({
      label: '!!需复核',
      level: 'low'
    });
  });
});
```

#### Edge Case Tests
```typescript
describe('getConfidenceLevel - Edge Cases', () => {
  it('handles invalid scores gracefully', () => {
    expect(ConfidenceThresholds.getConfidenceLevel(NaN)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(-1)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(2)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(Infinity)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(null as any)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(undefined as any)).toBe('low');
  });

  it('handles boundary conditions correctly', () => {
    // Exact boundaries
    expect(ConfidenceThresholds.getConfidenceLevel(0.6)).toBe('medium');
    expect(ConfidenceThresholds.getConfidenceLevel(0.8)).toBe('high');

    // Just below boundaries
    expect(ConfidenceThresholds.getConfidenceLevel(0.5999)).toBe('low');
    expect(ConfidenceThresholds.getConfidenceLevel(0.7999)).toBe('medium');
  });
});
```

## T034: IPC Integration Tests

### File: `tests/integration/ipc/reports.test.ts`

### Implementation Prerequisites

Create `src/main/ipc/handlers/reportsHandler.ts`:
```typescript
import { ipcMain } from 'electron';
import { z } from 'zod';

// Zod validators
const GetTodaySchema = z.object({});
const GetByDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
const ExpandItemSchema = z.object({
  itemId: z.number(),
  isExpanded: z.boolean()
});
const CopySearchTermSchema = z.object({
  itemId: z.number()
});

export function registerReportsHandlers(): void {
  // reports:get-today
  ipcMain.handle('reports:get-today', async () => {
    // Implementation
  });

  // reports:get-by-date
  ipcMain.handle('reports:get-by-date', async (event, data) => {
    const validated = GetByDateSchema.parse(data);
    // Implementation
  });

  // reports:expand-item
  ipcMain.handle('reports:expand-item', async (event, data) => {
    const validated = ExpandItemSchema.parse(data);
    // Implementation
  });

  // reports:copy-search-term
  ipcMain.handle('reports:copy-search-term', async (event, data) => {
    const validated = CopySearchTermSchema.parse(data);
    // Implementation
  });
}
```

### Test Scenarios

#### Request/Response Validation
```typescript
import { ipcRenderer } from 'electron';
import { registerReportsHandlers } from '@/main/ipc/handlers/reportsHandler';

describe('Reports IPC Channels', () => {
  beforeEach(() => {
    registerReportsHandlers();
  });

  describe('reports:get-today', () => {
    it('returns today\'s report with valid structure', async () => {
      const report = await ipcRenderer.invoke('reports:get-today');

      expect(report).toHaveProperty('date');
      expect(report).toHaveProperty('items');
      expect(report).toHaveProperty('summary');
      expect(Array.isArray(report.items)).toBe(true);
    });

    it('returns empty report for dates with no data', async () => {
      const report = await ipcRenderer.invoke('reports:get-by-date', {
        date: '2024-01-01'
      });

      expect(report.items).toEqual([]);
    });
  });

  describe('reports:get-by-date', () => {
    it('accepts valid date format', async () => {
      await expect(
        ipcRenderer.invoke('reports:get-by-date', { date: '2024-03-09' })
      ).resolves.toBeDefined();
    });

    it('rejects invalid date format', async () => {
      await expect(
        ipcRenderer.invoke('reports:get-by-date', { date: 'invalid' })
      ).rejects.toThrow();
    });

    it('rejects missing date parameter', async () => {
      await expect(
        ipcRenderer.invoke('reports:get-by-date', {})
      ).rejects.toThrow();
    });
  });

  describe('reports:expand-item', () => {
    it('updates item expansion state', async () => {
      const result = await ipcRenderer.invoke('reports:expand-item', {
        itemId: 1,
        isExpanded: true
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid itemId', async () => {
      await expect(
        ipcRenderer.invoke('reports:expand-item', {
          itemId: -1,
          isExpanded: true
        })
      ).rejects.toThrow();
    });
  });

  describe('reports:copy-search-term', () => {
    it('copies search term to clipboard', async () => {
      const result = await ipcRenderer.invoke('reports:copy-search-term', {
        itemId: 1
      });

      expect(result.success).toBe(true);
      expect(result.searchTerm).toMatch(/^from:.+/);
    });
  });
});
```

#### Data Persistence Tests
```typescript
describe('Data Persistence', () => {
  it('persist expansion state across queries', async () => {
    // Expand item
    await ipcRenderer.invoke('reports:expand-item', {
      itemId: 1,
      isExpanded: true
    });

    // Query report again
    const report = await ipcRenderer.invoke('reports:get-today');
    const item = report.items.find((i: any) => i.id === 1);

    expect(item.isExpanded).toBe(true);
  });
});
```

#### Error Handling Tests
```typescript
describe('Error Handling', () => {
  it('returns error for non-existent item', async () => {
    await expect(
      ipcRenderer.invoke('reports:expand-item', {
        itemId: 99999,
        isExpanded: true
      })
    ).rejects.toThrow('Item not found');
  });

  it('handles database connection failures gracefully', async () => {
    // Mock database failure
    const result = await ipcRenderer.invoke('reports:get-today');
    expect(result).toHaveProperty('error');
  });
});
```

## T035: ItemCard Component Tests

### File: `tests/unit/renderer/components/reports/ItemCard.test.tsx`

### Component Implementation

Extract from `src/renderer/components/ReportView/ReportView.tsx`:

```typescript
// src/renderer/components/reports/ItemCard.tsx
import { ConfidenceThresholds } from '@/shared/utils/ConfidenceThresholds';

interface ItemCardProps {
  item: ReportDisplayItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ItemCard({ item, isExpanded, onToggleExpand }: ItemCardProps) {
  const confidenceDisplay = ConfidenceThresholds.getConfidenceDisplay(item.confidence || 0);

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'shadow-md' : 'hover:shadow-md'}
      `}
      onClick={onToggleExpand}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleExpand();
        }
      }}
    >
      {/* Header - Always visible */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <ConfidenceBadge level={confidenceDisplay.level} />
          <h3 className="flex-1 font-medium">{item.title}</h3>
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Details - Expandable */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-4 pb-4 border-t border-gray-100">
          <ItemDetails item={item} />
          <FeedbackButtons itemId={item.id} />
        </div>
      </div>
    </div>
  );
}
```

### Test Scenarios

#### Expand/Collapse Animation
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemCard } from '@/renderer/components/reports/ItemCard';

describe('ItemCard - Expand/Collapse', () => {
  const mockItem = {
    id: 1,
    title: 'Test Item',
    confidence: 0.8,
    priority: 'high'
  };

  it('renders collapsed by default', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    // Check that details section is hidden
    const details = container.querySelector('[class*="max-h-0"]');
    expect(details).toBeInTheDocument();
  });

  it('expands when clicked', () => {
    const onToggleExpand = vi.fn();
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />
    );

    fireEvent.click(container.firstChild as HTMLElement);

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('applies CSS transition classes', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('transition-all');
    expect(card).toHaveClass('duration-300');
  });

  it('shows details when expanded', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    const details = container.querySelector('[class*="max-h-96"]');
    expect(details).toBeInTheDocument();
  });

  it('rotates chevron icon when expanded', () => {
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    const chevron = container.querySelector('svg');
    expect(chevron).toHaveClass('rotate-180');
  });
});
```

#### Visual Elements
```typescript
describe('ItemCard - Visual Elements', () => {
  it('displays confidence badge with correct label', () => {
    render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    expect(screen.getByText('✓准确')).toBeInTheDocument();
  });

  it('displays item title', () => {
    render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('renders feedback buttons when expanded', () => {
    render(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    // Check for feedback buttons
    const okButton = screen.getByRole('button', { name: /标记准确/ });
    const errorButton = screen.getByRole('button', { name: /标记错误/ });

    expect(okButton).toBeInTheDocument();
    expect(errorButton).toBeInTheDocument();
  });
});
```

#### Keyboard Navigation
```typescript
describe('ItemCard - Keyboard Navigation', () => {
  it('toggles expansion on Enter key', () => {
    const onToggleExpand = vi.fn();
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('toggles expansion on Space key', () => {
    const onToggleExpand = vi.fn();
    const { container } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.keyDown(card, { key: ' ' });

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('updates aria-expanded attribute', () => {
    const { container, rerender } = render(
      <ItemCard
        item={mockItem}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <ItemCard
        item={mockItem}
        isExpanded={true}
        onToggleExpand={vi.fn()}
      />
    );

    expect(card).toHaveAttribute('aria-expanded', 'true');
  });
});
```

## Data Flow

### T033 Flow
```
Component receives item with confidence score
  ↓
Calls getConfidenceDisplay(score)
  ↓
ConfidenceThresholds.getConfidenceLevel(score) → classification
  ↓
Returns { label: '✓准确', level: 'high' }
  ↓
Component renders badge with label
```

### T034 Flow
```
Renderer invokes IPC channel
  ↓
Main process receives request
  ↓
Zod validates request schema
  ↓
Handler queries database
  ↓
Response serialized and sent to renderer
  ↓
Renderer receives typed response
```

### T035 Flow
```
Parent component manages expansion state
  ↓
Passes isExpanded + onToggleExpand to ItemCard
  ↓
User clicks card
  ↓
onToggleExpand callback fires
  ↓
Parent updates state
  ↓
ItemCard re-renders with new isExpanded prop
  ↓
CSS transition animates height change (300ms)
```

## Error Handling

### T033 Error Handling
- **Invalid scores:** Return 'low' level (fail-safe)
- **NaN/null/undefined:** Treat as 0, return 'low'
- **No exceptions thrown:** Always return valid object

### T034 Error Handling
- **Invalid Zod schema:** Return 400 error with validation details
- **Database connection failure:** Return 500 error with message
- **Invalid itemId:** Return 404-style error
- **Timeout protection:** 30s max per connection tester pattern

### T035 Error Handling
- **Missing item data:** Render empty card with error state
- **Invalid confidence:** getConfidenceDisplay returns safe defaults
- **onClick failure:** Error boundary catches and logs

## Testing Strategy

### Coverage Requirements
- Unit tests: ≥80% line coverage, ≥70% branch coverage
- Security-critical: 100% branch coverage (Zod validation)
- All tests follow Red-Green-Refactor TDD

### Test Framework Stack
- **Unit Tests:** Vitest + React Testing Library
- **Integration Tests:** Vitest with electron-mock
- **Component Tests:** React Testing Library
- **Coverage:** c8 or vitest coverage

### TDD Workflow
1. Write failing test (Red)
2. Run test → Confirm failure
3. Implement minimum code to pass
4. Run test → Confirm passing (Green)
5. Refactor if needed
6. Commit

### Test Execution Order
```bash
# Phase 1: Write all tests (they fail)
pnpm test -- tests/unit/shared/reports/confidence.test.ts
pnpm test -- tests/integration/ipc/reports.test.ts
pnpm test -- tests/unit/renderer/components/reports/ItemCard.test.tsx

# Phase 2: Implement features (tests pass one by one)
# T033: Implement getConfidenceLevel + getConfidenceDisplay
# T034: Implement IPC handlers
# T035: Extract and implement ItemCard

# Phase 3: Verify coverage
pnpm test --coverage
```

## Success Criteria

### T033 Success
- [ ] All confidence tests pass
- [ ] Boundary conditions handled correctly
- [ ] Invalid scores return safe defaults
- [ ] Chinese labels display correctly
- [ ] Coverage ≥80% line, ≥70% branch

### T034 Success
- [ ] All IPC integration tests pass
- [ ] Zod validation catches malformed requests
- [ ] Database errors handled gracefully
- [ ] Expansion state persists
- [ ] Clipboard integration works

### T035 Success
- [ ] ItemCard expand/collapse works
- [ ] CSS animation ~300ms
- [ ] Keyboard navigation functional
- [ ] ARIA attributes correct
- [ ] Confidence badge displays
- [ ] Feedback buttons present when expanded

## Next Steps

1. ✅ Design approved
2. Create implementation plan via `writing-plans` skill
3. Execute T033, T034, T035 in parallel (they're independent)
4. Verify all tests pass
5. Run coverage report
6. Update documentation

---

**Design Approved:** 2025-03-09
**Next Action:** Invoke `writing-plans` skill to create detailed implementation plan
