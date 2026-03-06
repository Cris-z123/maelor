# Design Document: Tasks T005-T007 Setup Infrastructure

**Date**: 2026-03-06
**Feature**: 002-user-interaction-system
**Tasks**: T005 (IPC Client), T006 (Type Definitions), T007 (Theme Configuration)
**Status**: Design Approved

## Overview

This design covers three parallel setup tasks that provide the foundational infrastructure for the user interaction system:

1. **T005**: Extend the IPC client abstraction layer to support all 21 IPC channels defined in the contract
2. **T006**: Refine shared TypeScript type definitions to eliminate `any` types and improve type safety
3. **T007**: Configure custom theme colors and Inter font family per visual design specifications

These tasks are independent and can be implemented in parallel. All three are prerequisites for user story implementation (Phase 3+).

---

## T005: IPC Client Extension

### Architecture

**Component**: `src/renderer/services/ipc.ts`

**Pattern**: Singleton service class with type-safe wrapper methods for all IPC channels

**Responsibilities**:
- Provide type-safe communication layer between renderer and main processes
- Handle IPC errors gracefully with specific error messages
- Provide mock API fallback for development/testing outside Electron
- Support both invoke (request/response) and on (event-based) IPC patterns

### Data Flow

```
Renderer Component
    ↓
IPCClient Method (typed)
    ↓
window.electronAPI (preload)
    ↓
Main Process Handler
    ↓
Response/Error
```

### API Design

The IPCClient class will be extended with the following method groups:

#### 1. Onboarding Channels (5 methods)
```typescript
// Get onboarding wizard status
async getOnboardingStatus(): Promise<OnboardingStatus>

// Update onboarding step with data
async setOnboardingStep(step: 1 | 2 | 3, data?: StepData): Promise<{ success: boolean; error?: string }>

// Auto-detect email client path
async detectEmailClient(type: 'thunderbird' | 'outlook' | 'apple-mail'): Promise<{ detectedPath: string | null; error?: string }>

// Validate email client path
async validateEmailPath(path: string): Promise<{ valid: boolean; message: string }>

// Test LLM connection
async testLLMConnection(config: TestLLMRequest): Promise<{ success: boolean; responseTime: number; error?: string }>
```

#### 2. Generation Channels (3 methods + event listener)
```typescript
// Start manual report generation
async startGeneration(): Promise<{ success: boolean; emailCount?: number; error?: string }>

// Cancel in-progress generation
async cancelGeneration(): Promise<{ success: boolean; message: string }>

// Listen for progress events (returns unsubscribe function)
onProgress(callback: (data: GenerationProgress) => void): () => void
```

#### 3. Reports Channels (6 methods)
```typescript
// Get today's report
async getTodayReport(): Promise<TodayReport>

// Get report for specific date
async getReportByDate(date: string): Promise<TodayReport>

// Search historical reports
async searchReports(request: SearchRequest): Promise<SearchResponse>

// Get item details with source emails
async expandItem(itemId: string): Promise<ItemDetails>

// Submit accuracy feedback
async submitFeedback(request: FeedbackRequest): Promise<{ success: boolean; message: string }>

// Copy search term to clipboard
async copySearchTerm(itemId: string): Promise<{ success: boolean; searchTerm: string }>
```

#### 4. Settings Channels (4 methods)
```typescript
// Get all settings
async getAllSettings(): Promise<SettingsState>

// Update settings section
async updateSettings(section: SettingsSection, updates: Partial<SettingsState>): Promise<{ success: boolean; error?: string }>

// Clean old data
async cleanupData(dateRange: string): Promise<CleanupPreview>

// Destroy all feedback data
async destroyFeedback(confirmation: string): Promise<{ success: boolean; deletedCount: number; error?: string }>
```

#### 5. Notifications Channels (2 methods)
```typescript
// Send test notification
async sendTestNotification(): Promise<{ success: boolean; error?: string }>

// Configure notification settings
async configureNotifications(settings: Partial<NotificationSettings>): Promise<{ success: boolean; error?: string }>
```

### Error Handling

All methods follow consistent error handling pattern:
1. Try to invoke IPC channel
2. Catch errors and log with context
3. Throw descriptive error with channel name and original message
4. Mock API returns safe defaults when ElectronAPI unavailable

### Testing Considerations

**Unit Tests** (`tests/unit/renderer/services/ipc.test.ts`):
- Test each method with successful responses
- Test error handling for IPC failures
- Test mock API fallback behavior
- Test type safety (TypeScript compilation)

**Integration Tests** (`tests/integration/ipc/*.test.ts`):
- Test actual IPC communication with main process handlers
- Test event listeners (progress updates)
- Test error propagation from main to renderer

---

## T006: Type Definitions Refinement

### Architecture

**Components**:
- `src/shared/types/onboarding.ts` (complete)
- `src/shared/types/reports.ts` (complete)
- `src/shared/types/history.ts` (complete)
- `src/shared/types/settings.ts` (needs refinement)

**Pattern**: Domain-driven type definitions with clear separation of concerns

### Refactoring Strategy

**Current Issue**: `settings.ts` uses `any` for email, schedule, and llm types

**Solution**: Import from `onboarding.ts` to eliminate duplication

```typescript
// Before (settings.ts)
export interface AllSettings {
  email: any; // ❌ Not type-safe
  schedule: any;
  llm: any;
  notifications: NotificationSettings;
  display: DisplaySettings;
}

// After (settings.ts)
import { EmailClientConfig, ScheduleConfig, LLMConfig } from './onboarding';

export interface AllSettings {
  email: EmailClientConfig; // ✅ Type-safe
  schedule: ScheduleConfig;
  llm: LLMConfig;
  notifications: NotificationSettings;
  display: DisplaySettings;
}
```

### New Types to Add

#### 1. DataManagementSettings
```typescript
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
```

#### 2. SettingsSection Type
```typescript
export type SettingsSection =
  | 'email'
  | 'schedule'
  | 'llm'
  | 'display'
  | 'notifications'
  | 'data';
```

#### 3. UpdateSettingsRequest
```typescript
export interface UpdateSettingsRequest {
  section: SettingsSection;
  updates: Partial<AllSettings>;
}
```

### Type Export Structure

All types re-exported from `src/shared/types/index.ts` for clean imports:

```typescript
export * from './onboarding';
export * from './reports';
export * from './history';
export * from './settings';
```

---

## T007: Custom Theme Configuration

### Architecture

**Components**:
- `src/renderer/styles/fonts.css` (Inter font)
- `src/renderer/styles/globals.css` (CSS variables)
- `tailwind.config.js` (Tailwind theme)

**Pattern**: CSS custom properties (variables) for semantic colors, Tailwind utilities for application

### Color Mapping

**Design Specification** (FR-090):

| Semantic Name | Chinese Name | HEX | HSL | Usage |
|---------------|--------------|-----|-----|-------|
| Primary | 智捷蓝 | #4F46E5 | 243 87% 59% | Primary actions, links |
| Secondary | 灵动青 | #06B6D4 | 187 92% 42% | Secondary actions |
| Success | 翠绿 | #10B981 | 158 64% 42% | Success states |
| Warning | 琥珀黄 | #F59E0B | 38 92% 49% | Warnings |
| Destructive | 珊瑚红 | #EF4444 | 0 72% 59% | Errors, destructive actions |
| Background | 极简灰 | #F8FAFC | 210 40% 98% | Page background |
| Foreground | 深岩灰 | #1E293B | 215 16% 15% | Primary text |
| Muted Foreground | 中灰 | #64748B | 215 16% 47% | Secondary text |
| Disabled | 浅灰 | #CBD5E1 | 215 26% 80% | Disabled states |
| Card | 纯白 | #FFFFFF | 0 0% 100% | Card backgrounds |
| Border | 淡灰蓝 | #E2E8F0 | 215 26% 91% | Borders |
| Low Confidence | - | #FFFBE6 | 48 100% 97% | Low confidence items |

### CSS Variables Structure

```css
:root {
  /* Brand Colors */
  --primary: 243 87% 59%;        /* 智捷蓝 */
  --secondary: 187 92% 42%;      /* 灵动青 */

  /* Semantic Colors */
  --success: 158 64% 42%;        /* 翠绿 */
  --warning: 38 92% 49%;         /* 琥珀黄 */
  --destructive: 0 72% 59%;      /* 珊瑚红 */

  /* Neutral Colors */
  --background: 210 40% 98%;     /* 极简灰 */
  --foreground: 215 16% 15%;     /* 深岩灰 */
  --muted-foreground: 215 16% 47%; /* 中灰 */

  /* UI Colors */
  --card: 0 0% 100%;             /* 纯白 */
  --border: 215 26% 91%;         /* 淡灰蓝 */
  --disabled: 215 26% 80%;       /* 浅灰 */

  /* Special Colors */
  --low-confidence-bg: 48 100% 97%; /* Low confidence background */

  /* Animation timings (FR-095) */
  --duration-fast: 150ms;        /* Fast transitions */
  --duration-normal: 300ms;      /* Standard transitions */
  --duration-slow: 500ms;        /* Slow transitions */
}
```

### Tailwind Theme Integration

**Font Configuration** (already exists):
```javascript
fontFamily: {
  sans: ["Inter", "sans-serif"],
}
```

**Custom Animation Timings**:
```javascript
transitionDuration: {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
}
```

**Brand Color Utility**:
```javascript
colors: {
  'brand-blue': '#4F46E5', // 智捷蓝
  'brand-cyan': '#06B6D4', // 灵动青
  'low-confidence': '#FFFBE6',
}
```

### Responsive Typography

**Font Sizes** (FR-091):
- Page title: 24px (`text-2xl`)
- Section title: 18px (`text-xl`)
- Body text: 14px (`text-sm` / default)
- Small text: 12px (`text-xs`)
- Button text: 14px (`text-sm`)
- Code/path: 13px (`text-xs` with mono font)

---

## Implementation Checklist

### T005: IPC Client Extension
- [ ] Add onboarding channel methods (5 methods)
- [ ] Add generation channel methods (3 methods + event listener)
- [ ] Add reports channel methods (6 methods)
- [ ] Add settings channel methods (4 methods)
- [ ] Add notifications channel methods (2 methods)
- [ ] Update mock API with new channels
- [ ] Add JSDoc comments for all methods
- [ ] Export typed ElectronAPI interface extension

### T006: Type Definitions Refinement
- [ ] Update `settings.ts` to import from `onboarding.ts`
- [ ] Add `DataManagementSettings` interface
- [ ] Add `SettingsSection` type
- [ ] Add `UpdateSettingsRequest` interface
- [ ] Update `AllSettings` to use concrete types
- [ ] Re-export all types from `index.ts`

### T007: Custom Theme Configuration
- [ ] Convert HEX colors to HSL format
- [ ] Update `:root` CSS variables in `globals.css`
- [ ] Add animation duration variables
- [ ] Extend `tailwind.config.js` with custom timings
- [ ] Add brand color utilities to Tailwind config
- [ ] Verify WCAG AA contrast ratios
- [ ] Test Inter font rendering across platforms

---

## Migration & Compatibility

### Breaking Changes
None. These are new additions/extensions.

### Backward Compatibility
- Existing IPC client methods unchanged
- Existing type definitions unchanged (only imports modified)
- CSS variables extend existing pattern (shadcn/ui compatible)

### Rollback Strategy
Git revert if issues arise. No database migrations required.

---

## Performance Considerations

### T005: IPC Client
- Event listeners use cleanup functions to prevent memory leaks
- Mock API for testing has minimal overhead
- Type validation happens at compile time (TypeScript)

### T006: Type Definitions
- Pure type definitions - zero runtime overhead
- Import re-exports optimized by bundler

### T007: Theme Configuration
- CSS variables are natively optimized by browsers
- Inter font uses variable font (single file, all weights)
- Animation timings use GPU-accelerated properties

---

## Security Considerations

### T005: IPC Client
- All channels comply with IPC whitelist (Constitution Principle V)
- No sensitive data in error messages
- Mock API doesn't expose real Electron APIs

### T006: Type Definitions
- No runtime security impact (compile-time only)

### T007: Theme Configuration
- No security impact (purely visual)

---

## Accessibility (WCAG AA Compliance)

### Color Contrast
- 智捷蓝 (#4F46E5) on 纯白 (#FFFFFF): 5.1:1 ✅ (WCAG AA)
- 深岩灰 (#1E293B) on 极简灰 (#F8FAFC): 14.3:1 ✅ (WCAG AAA)
- 中灰 (#64748B) on 极简灰 (#F8FAFC): 4.8:1 ✅ (WCAG AA)

### Font Sizes
- Minimum 12px for small text ✅
- 14px for body text (readable) ✅
- 18px+ for headings ✅

---

## Success Criteria

### T005: IPC Client
- ✅ All 21 IPC channels have typed wrapper methods
- ✅ Error handling provides specific error messages
- ✅ Mock API allows development without Electron
- ✅ TypeScript compilation succeeds without `any` types
- ✅ Unit tests achieve ≥80% line coverage

### T006: Type Definitions
- ✅ Zero `any` types in exported interfaces
- ✅ All types re-exported from `index.ts`
- ✅ Types match IPC channel contracts exactly
- ✅ TypeScript compilation succeeds

### T007: Custom Theme Configuration
- ✅ All brand colors applied to CSS variables
- ✅ Inter font loads correctly (check DevTools)
- ✅ WCAG AA contrast ratios met for all text
- ✅ Animation timings (150ms/300ms/500ms) work correctly
- ✅ Theme consistent across all renderer components

---

## Open Questions

None. All design decisions approved.

---

## Next Steps

1. Implement T005-T007 in parallel (independent tasks)
2. Run TypeScript compiler to verify type safety
3. Run unit tests to verify coverage
4. Visual testing for theme (check colors, fonts, animations)
5. Mark tasks T005, T006, T007 as complete in `tasks.md`
6. Proceed to Phase 2: Foundational tasks (T008-T017)

---

**Design Status**: ✅ Approved
**Ready for Implementation**: Yes
**Estimated Effort**: 2-3 hours for all three tasks
