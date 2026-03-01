# Design Document: Phase 1 Setup Tasks (T001-T004)

**Feature**: User Interaction System (002-user-interaction-system)
**Date**: 2026-03-02
**Status**: Approved
**Tasks**: T001-T004 (Shared Infrastructure Setup)

---

## Overview

This design document covers the initial infrastructure setup for the user interaction system. These four tasks create the foundational directory structure, UI component library integration, state management persistence, and validation schema organization required for all subsequent user stories.

---

## T001: Directory Structure Creation

### Current State

Based on project audit, the following directories **already exist**:
- ✅ `src/main/onboarding/`, `src/main/notifications/`
- ✅ `src/renderer/components/{reports,generation,history,shared,ui}/`
- ✅ `src/renderer/stores/`, `src/renderer/services/`, `src/renderer/hooks/`
- ✅ `src/shared/schemas/`, `src/shared/types/`, `src/shared/utils/`

### Actions Required

1. **Verify naming consistency**:
   - Check if `src/renderer/components/Onboarding/` should be lowercase `onboarding/`
   - Check if `src/renderer/components/Settings/` should be lowercase `settings/`
   - Standardize per project conventions

2. **Create missing subdirectories**:
   - `src/shared/types/onboarding.ts`
   - `src/shared/types/reports.ts`
   - `src/shared/types/history.ts`
   - `src/shared/types/settings.ts`

3. **Add index files** for cleaner imports:
   - `src/renderer/stores/index.ts`
   - `src/renderer/hooks/index.ts`
   - `src/renderer/services/index.ts`

4. **Document structure** in project README

### Success Criteria
- All required directories exist
- Naming follows consistent convention (kebab-case or PascalCase)
- Index barrel files enable clean imports
- Documentation reflects final structure

---

## T002: shadcn/ui Components Installation

### Current State

**Already installed**:
- button, dialog, card, label, select, tooltip, badge

**Missing components** (required by T002):
- Calendar, Input, Progress, Toast

### Installation Steps

1. **Verify shadcn/ui configuration**:
   ```bash
   # Check for components.json
   cat components.json
   ```

2. **Install missing components**:
   ```bash
   npx shadcn@latest add calendar input progress toast
   ```

3. **Verify installation**:
   - Check `src/renderer/components/ui/` for new files
   - Verify Tailwind CSS configuration
   - Test imports in sample component

4. **Theme integration**:
   - Ensure components use智捷蓝 (#4F46E5) primary color
   - Apply Inter font family
   - Configure custom animations (150ms fast, 300ms standard, 500ms slow)

### Component Usage

- **Calendar**: History page date selection with blue-dot indicators
- **Input**: Text inputs in onboarding wizard and settings forms
- **Progress**: Report generation progress bar (0-100%)
- **Toast**: Success/error/warning notifications (3-5s duration)

### Success Criteria
- All 4 components install without errors
- Components render correctly in test environment
- Theme matches visual design specifications
- No TypeScript errors

---

## T003: Zustand Persistence with Field-Level Encryption

### Architecture

Create custom encrypted persistence middleware following constitution v1.1.0 field-level AES-256-GCM encryption requirements.

### Implementation Structure

```typescript
// src/renderer/stores/middleware/encryptedPersistence.ts
import { StateStorage } from 'zustand/middleware';
import { safeStorage } from 'electron';

interface EncryptedPersistenceConfig<T> {
  sensitiveFields: (keyof T)[];  // Fields to encrypt
  storage?: StateStorage;         // Default: localStorage
}

export function createEncryptedPersistence<T>(
  config: EncryptedPersistenceConfig<T>
) {
  // Wrap Zustand's persist middleware
  // Encrypt sensitiveFields before save
  // Decrypt sensitiveFields after load
}
```

### Key Design Decisions

1. **Field-level encryption**:
   - Only encrypt truly sensitive data (API keys, file paths)
   - Store non-sensitive state as plaintext (UI preferences, toggle states)
   - Enables easier debugging while maintaining security

2. **Electron safeStorage integration**:
   - Uses OS-level keychain (Windows Credential Manager, macOS Keychain, etc.)
   - Keys auto-generated, no user password required
   - Device-bound, no recovery path (per constitution)

3. **Error handling**:
   - Graceful degradation if safeStorage unavailable
   - Validate decrypted data against Zod schemas
   - Log warnings without blocking app startup

### Store Integration Example

```typescript
// src/renderer/stores/onboardingStore.ts
import { create } from 'zustand';
import { createEncryptedPersistence } from './middleware/encryptedPersistence';
import { OnboardingState } from '@shared/schemas/onboarding';

interface OnboardingStore extends OnboardingState {
  // Actions
  setStep: (step: number) => void;
  // ...
}

export const useOnboardingStore = create<OnboardingStore>()(
  createEncryptedPersistence({
    sensitiveFields: ['llm.apiKey', 'emailClient.path'],
    partialize: (state) => ({ /* ... */ })
  })
);
```

### Success Criteria
- Middleware encrypts only sensitive fields
- Non-sensitive fields remain readable in localStorage
- Encryption/decryption transparent to store logic
- Error handling prevents data loss
- Unit tests cover encryption/decryption paths

---

## T004: Zod Schema Organization by Domain

### File Structure

```
src/shared/schemas/
├── validation.ts          # Core/common schemas (keep existing - ItemSchema, etc.)
├── onboarding.ts          # NEW: Onboarding state, email client, schedule, LLM config
├── reports.ts             # NEW: Report display, confidence, feedback, search terms
├── history.ts             # NEW: Search filters, date ranges, pagination
├── settings.ts            # NEW: All settings sections, validation schemas
└── index.ts               # NEW: Central export barrel
```

### Schema Organization

#### 1. onboarding.ts
Schemas for first-time setup wizard:
```typescript
export const EmailClientConfigSchema = z.object({
  type: z.enum(['thunderbird', 'outlook', 'apple-mail']),
  path: z.string().min(1),
  detectedPath: z.string().nullable(),
  validated: z.boolean(),
});

export const ScheduleConfigSchema = z.object({
  generationTime: z.object({
    hour: z.number().min(0).max(23),
    minute: z.number().min(0).max(59),
  }),
  skipWeekends: z.boolean(),
});

export const LLMConfigSchema = z.object({
  mode: z.enum(['local', 'remote']),
  localEndpoint: z.string().url(),
  remoteEndpoint: z.string().url(),
  apiKey: z.string().min(20),
  connectionStatus: z.enum(['untested', 'success', 'failed']),
});

export const OnboardingStateSchema = z.object({
  completed: z.boolean(),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  emailClient: EmailClientConfigSchema,
  schedule: ScheduleConfigSchema,
  llm: LLMConfigSchema,
  lastUpdated: z.number(),
});
```

#### 2. reports.ts
Schemas for daily report display and interaction:
```typescript
export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const ConfidenceDisplaySchema = z.object({
  score: z.number().min(0).max(1),
  level: ConfidenceLevelSchema,
});

export const FeedbackTypeSchema = z.enum([
  'content_error',
  'priority_error',
  'not_actionable',
  'source_error',
]);

export const FeedbackSubmissionSchema = z.object({
  itemId: z.string().uuid(),
  feedbackType: FeedbackTypeSchema,
  timestamp: z.number(),
});

export const ReportDisplayItemSchema = z.object({
  itemId: z.string(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemType: z.enum(['completed', 'pending']),
  content: z.object({
    title: z.string().max(200),
    description: z.string().max(500).optional(),
    dueDate: z.string().nullable(),
    priority: z.enum(['high', 'medium', 'low']),
  }),
  confidence: ConfidenceDisplaySchema,
  sourceStatus: z.enum(['verified', 'unverified']),
  sourceEmails: z.array(z.object({ /* ... */ })),
});
```

#### 3. history.ts
Schemas for historical report search and filtering:
```typescript
export const SearchFiltersSchema = z.object({
  itemType: z.enum(['completed', 'pending', 'all']).optional(),
  confidenceLevel: ConfidenceLevelSchema.optional(),
  hasFeedback: z.boolean().optional(),
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).optional(),
});

export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const SearchQuerySchema = z.object({
  keywords: z.string().min(1),
  filters: SearchFiltersSchema.optional(),
  pagination: PaginationParamsSchema,
});
```

#### 4. settings.ts
Schemas for application settings management:
```typescript
export const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  doNotDisturb: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
  soundEnabled: z.boolean(),
});

export const DisplaySettingsSchema = z.object({
  aiExplanationMode: z.boolean(),
});

export const AllSettingsSchema = z.object({
  email: EmailClientConfigSchema,
  schedule: ScheduleConfigSchema,
  llm: LLMConfigSchema,
  notifications: NotificationSettingsSchema,
  display: DisplaySettingsSchema,
});
```

#### 5. index.ts
Central export barrel for clean imports:
```typescript
// Re-export existing schemas
export * from './validation';

// Domain-specific schemas
export * from './onboarding';
export * from './reports';
export * from './history';
export * from './settings';
```

### Benefits

- **Clear domain boundaries**: Each file has single responsibility
- **Easier testing**: Import only what's needed
- **No circular dependencies**: Schemas depend on Zod primitives
- **Matches task requirements**: Per T004 specification

### Success Criteria
- All domain schemas created and exported
- TypeScript types inferred correctly from Zod schemas
- Import from `@shared/schemas` works without path aliases
- Validation errors provide helpful messages
- No circular dependencies

---

## Testing Strategy

### Unit Tests Required

1. **T003 - Encrypted Persistence**:
   - Test encryption/decryption of sensitive fields
   - Test non-sensitive fields remain readable
   - Test error handling (safeStorage unavailable)
   - Test Zod validation after decryption

2. **T004 - Schema Validation**:
   - Test valid inputs pass validation
   - Test invalid inputs fail with clear errors
   - Test type inference matches TypeScript types
   - Test schema composition (combining schemas)

### Integration Tests Required

1. **T002 - shadcn/ui Components**:
   - Render each component in test environment
   - Test component props and interactions
   - Verify theme integration

### Coverage Requirements

- Line coverage: ≥80%
- Branch coverage: ≥70%
- Security-critical (encryption): 100% branch coverage

---

## Dependencies

### Internal Dependencies

- T001: No dependencies (can start immediately)
- T002: Requires T001 (directories must exist)
- T003: Requires T001 (stores directory must exist)
- T004: Requires T001 (schemas directory must exist)

### External Dependencies

All packages already installed in `package.json`:
- ✅ zustand ^4.5.0
- ✅ zod ^3.22.4
- ✅ @radix-ui/* (for shadcn/ui)
- ✅ electron ^29.4.6 (safeStorage API)

### New Dependencies Required

**None** - all required packages are already installed.

---

## Risk Mitigation

### Risk 1: shadcn/ui CLI Installation Fails
**Mitigation**: Manual component creation using shadcn/ui source code as reference

### Risk 2: Electron safeStorage Unavailable on Linux
**Mitigation**: Graceful degradation with warning log, store data plaintext with clear documentation

### Risk 3: Circular Dependencies in Schema Organization
**Mitigation**: Strict separation by domain, use Zod primitives only, no cross-imports between domain schemas

### Risk 4: Existing Code Breaks After Directory Restructuring
**Mitigation**: Verify all imports before/after, run full test suite, commit changes atomically

---

## Acceptance Criteria

Tasks T001-T004 are complete when:

1. ✅ All required directories exist with consistent naming
2. ✅ All 4 shadcn/ui components (calendar, input, progress, toast) installed and tested
3. ✅ Encrypted persistence middleware implemented with unit tests passing
4. ✅ Domain-specific Zod schemas created with centralized exports
5. ✅ No TypeScript errors
6. ✅ All tests passing (≥80% line, ≥70% branch coverage)
7. ✅ Documentation updated (README with new structure)

---

## Next Steps

After T001-T004 completion, proceed to:
- **T005**: IPC client abstraction layer
- **T006**: Shared TypeScript type definitions
- **T007**: Inter font and theme configuration

These complete Phase 1 (Setup), enabling Phase 2 (Foundational) work to begin.

---

## References

- [Constitution v1.1.0](../../constitution/v1.1.0.md) - Privacy, encryption, testing requirements
- [tasks.md](../../specs/002-user-interaction-system/tasks.md) - T001-T004 detailed requirements
- [data-model.md](../../specs/002-user-interaction-system/data-model.md) - Schema specifications
- [plan.md](../../specs/002-user-interaction-system/plan.md) - Technical context and architecture
