# IPC Validation System Design

**Date**: 2026-03-07
**Feature**: 002-user-interaction-system (T014)
**Status**: Design Complete - Ready for Implementation Plan
**Author**: Claude (Sonnet 4.5)

---

## Executive Summary

This document describes the design for a centralized, type-safe IPC validation system that enforces strict input/output validation for all 21 IPC channels in the mailCopilot application. The system uses Zod schemas for runtime validation, provides context-aware error messages (detailed in development, generic in production), and organizes validators by domain for maintainability.

**Key Design Decisions**:
- ✅ Strict validation (Option A) - All handlers must have Zod schemas
- ✅ Domain-based modules (Option A) - Separate validator files per domain
- ✅ Context-aware errors (Option C) - Detailed in dev, generic in production
- ✅ Request/Response schema pairs (Option A) - Clear contract separation
- ✅ Hybrid migration (Option C) - Prioritize critical handlers, migrate others incrementally
- ✅ T017 marked complete - Existing safeStorage integration meets requirements

---

## 1. Architecture Overview

### 1.1 Goals

Create a centralized IPC validation system that:

1. **Enforces strict validation** - All IPC requests/responses validated against Zod schemas
2. **Provides type safety** - TypeScript types inferred from Zod schemas
3. **Improves security** - Invalid data rejected before reaching business logic
4. **Enhances debugging** - Context-aware error messages in development
5. **Scales maintainably** - Domain-based organization as system grows

### 1.2 File Structure

```
src/main/ipc/
├── channels.ts                    # Existing: IPC channel name constants (21 channels)
├── validators/                    # NEW: Domain-based validator modules
│   ├── registry.ts               # Central registration with validation wrapper
│   ├── common.ts                 # Shared Zod schemas (EmailClient, Schedule, etc.)
│   ├── onboarding.ts             # Onboarding channels (6 channels)
│   ├── generation.ts             # Report generation channels (3 channels)
│   ├── reports.ts                # Reports channels (7 channels)
│   ├── settings.ts               # Settings channels (4 channels)
│   └── notifications.ts          # Notifications channels (2 channels)
└── handlers/                      # Existing: Handler implementations
    ├── onboardingHandler.ts      # To be enhanced: Pure logic functions
    ├── cleanup.handler.ts
    ├── export.handler.ts
    ├── feedback.handler.ts
    ├── llmHandler.ts
    ├── retention.handler.ts
    ├── stats.handler.ts
    └── mode.handler.ts
```

### 1.3 Key Components

**Component 1: Validation Wrapper** (`validators/registry.ts`)
- Wraps all IPC handlers with automatic Zod validation
- Enforces strict validation (rejects invalid data)
- Provides context-aware error messages
- Logs all validation failures

**Component 2: Domain Validators** (separate files per domain)
- Define Request/Response Zod schema pairs
- Import and validate against contracts from `contracts/ipc-channels.md`
- Export typed handler functions

**Component 3: Common Schemas** (`validators/common.ts`)
- Reusable schemas (EmailClient, Schedule, LLM config)
- Referenced by domain validators to avoid duplication

---

## 2. Validation Wrapper Design

### 2.1 Core Interface

```typescript
export interface ValidatedHandler<TRequest, TResponse> {
  requestSchema: z.ZodSchema<TRequest>
  responseSchema: z.ZodSchema<TResponse>
  handler: (request: TRequest) => Promise<TResponse>
}
```

### 2.2 Registry Class

```typescript
export class IPCValidatorRegistry {
  // Register a validated IPC handler
  static register<TRequest, TResponse>(
    channel: string,
    validatedHandler: ValidatedHandler<TRequest, TResponse>
  ): void

  // Internal wrapper that enforces validation
  private static wrapHandler<TRequest, TResponse>(
    handler: ValidatedHandler<TRequest, TResponse>
  ): (event: IpcMainInvokeEvent, request: unknown) => Promise<TResponse>
}
```

### 2.3 Validation Flow

```
Renderer Request (IPC)
    ↓
[Validation Wrapper]
    ↓
requestSchema.safeParse(request)
    ↓
    ├─→ Success → Continue
    │
    └─→ Failure → Return structured error (dev: detailed, prod: generic)
              ↓
              Log validation failure
              ↓
              Throw ValidationError
    ↓
Call actual handler(request)
    ↓
Handler executes business logic
    ↓
responseSchema.safeParse(response)
    ↓
    ├─→ Success → Return response to renderer
    │
    └─→ Failure → Log error
              ↓
              Dev: Throw error (fail fast)
              Prod: Return response anyway (graceful degradation)
```

### 2.4 Error Response Format

**Development Mode** (detailed for debugging):
```typescript
{
  success: false,
  error: {
    message: 'Invalid email path',
    field: 'data.path',
    issues: [
      {
        code: 'too_small',
        path: ['data', 'path'],
        message: 'Path is required'
      }
    ]
  }
}
```

**Production Mode** (generic for security):
```typescript
{
  success: false,
  error: 'Invalid request data'
}
```

---

## 3. Domain Validator Structure

Each domain validator file follows this consistent pattern:

### 3.1 Template

```typescript
// File: validators/onboarding.ts

import { z } from 'zod'
import { IPCValidatorRegistry } from './registry.js'
import { IPC_CHANNELS } from '../channels.js'
import * as handlers from '../handlers/onboardingHandler.js'
import type { Database } from 'better-sqlite3'

// ==================== REQUEST SCHEMAS ====================

export const OnboardingGetStatusRequestSchema = z.object({
  // No parameters for this channel
}).strict()

export const OnboardingGetStatusResponseSchema = z.object({
  completed: z.boolean(),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  canProceed: z.boolean()
})

export const OnboardingSetStepRequestSchema = z.object({
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  data: z.object({
    emailClient: z.object({
      type: z.enum(['thunderbird', 'outlook', 'apple-mail']),
      path: z.string()
    }).optional(),
    schedule: z.object({
      generationTime: z.object({
        hour: z.number().int().min(0).max(23),
        minute: z.number().int().min(0).max(59)
      }),
      skipWeekends: z.boolean()
    }).optional(),
    llm: z.object({
      mode: z.enum(['local', 'remote']),
      localEndpoint: z.string().url().optional(),
      remoteEndpoint: z.string().url().optional(),
      apiKey: z.string().min(20).optional()
    }).optional()
  }).optional()
}).strict()

export const OnboardingSetStepResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
})

// ... (4 more channel schema pairs)

// ==================== HANDLER REGISTRATION ====================

export function registerOnboardingValidators(
  registry: typeof IPCValidatorRegistry,
  db: Database
): void {
  // Channel 1: Get onboarding status
  registry.register(
    IPC_CHANNELS.ONBOARDING_GET_STATUS,
    {
      requestSchema: OnboardingGetStatusRequestSchema,
      responseSchema: OnboardingGetStatusResponseSchema,
      handler: async () => handlers.handleGetStatus(db)
    }
  )

  // Channel 2: Set onboarding step
  registry.register(
    IPC_CHANNELS.ONBOARDING_SET_STEP,
    {
      requestSchema: OnboardingSetStepRequestSchema,
      responseSchema: OnboardingSetStepResponseSchema,
      handler: async (request) =>
        handlers.handleSetStep(db, request.step, request.data)
    }
  )

  // ... (4 more registrations)
}
```

### 3.2 Key Principles

1. **Explicit schemas** - Each channel has Request/Response pair
2. **Type inference** - TypeScript types derived from Zod schemas
3. **Logic separation** - Handlers delegate to existing functions
4. **Domain grouping** - Related channels in one file
5. **Consistency** - All validators follow same pattern

---

## 4. Common Schemas

### 4.1 Shared Reusable Schemas

File: `validators/common.ts`

```typescript
import { z } from 'zod'

// ==================== EMAIL CLIENT ====================

export const EmailClientTypeSchema = z.enum([
  'thunderbird',
  'outlook',
  'apple-mail'
])

export const EmailClientConfigSchema = z.object({
  type: EmailClientTypeSchema,
  path: z.string().min(1, 'Path is required')
})

// ==================== SCHEDULE ====================

export const GenerationTimeSchema = z.object({
  hour: z.number().int().min(0).max(23, 'Hour must be 0-23'),
  minute: z.number().int().min(0).max(59, 'Minute must be 0-59')
})

export const ScheduleConfigSchema = z.object({
  generationTime: GenerationTimeSchema,
  skipWeekends: z.boolean()
})

// ==================== LLM CONFIGURATION ====================

export const LLMModeSchema = z.enum(['local', 'remote'])

export const LocalLLMConfigSchema = z.object({
  mode: z.literal('local'),
  endpoint: z.string().url('Must be valid URL').optional()
})

export const RemoteLLMConfigSchema = z.object({
  mode: z.literal('remote'),
  endpoint: z.string().url('Must be HTTPS URL').refine(
    (val) => val.startsWith('https://'),
    'Remote mode requires HTTPS'
  ),
  apiKey: z.string().min(20, 'API key must be at least 20 characters')
})

export const LLMConfigSchema = z.union([
  LocalLLMConfigSchema,
  RemoteLLMConfigSchema
])

// ==================== NOTIFICATIONS ====================

export const NotificationPrioritySchema = z.enum([
  'low',
  'normal',
  'urgent'
])

export const NotificationTypeSchema = z.enum([
  'report_complete',
  'error',
  'system'
])

// ==================== RESPONSES ====================

export const SuccessResponseSchema = z.object({
  success: z.literal(true)
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string()
})

export const ResponseWithDataSchema = <TData extends z.ZodType>(data: TData) =>
  z.object({
    success: z.literal(true),
    data
  })
```

### 4.2 Usage Example

```typescript
// In validators/settings.ts
import { ScheduleConfigSchema, LLMConfigSchema } from './common.js'

export const SettingsUpdateRequestSchema = z.object({
  section: z.enum(['email', 'schedule', 'llm', 'display', 'notifications', 'data']),
  updates: z.object({
    schedule: ScheduleConfigSchema.optional(),
    llm: LLMConfigSchema.optional()
    // ... other fields
  }).strict()
})
```

---

## 5. Integration Strategy

### 5.1 Handler Refactoring

**Before** (current `handlers/onboardingHandler.ts`):
```typescript
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../channels.js'

export function registerOnboardingHandlers(db: Database): void {
  ipcMain.handle(IPC_CHANNELS.ONBOARDING_GET_STATUS, async () => {
    // Direct IPC registration + logic mixed
  })
}
```

**After** (refactored `handlers/onboardingHandler.ts`):
```typescript
// Remove ipcMain imports
// Remove registration logic
// Export pure handler functions

export async function handleGetStatus(
  db: Database
): Promise<OnboardingStatus> {
  // Pure business logic
}

export async function handleSetStep(
  db: Database,
  step: 1 | 2 | 3,
  data?: StepData
): Promise<{ success: boolean; error?: string }> {
  // Pure business logic
}
```

### 5.2 Main Process Updates

**Before** (current `index.ts`):
```typescript
import { registerOnboardingHandlers } from './ipc/handlers/onboardingHandler.js'

private setupIPCHandlers(): void {
  const db = DatabaseManager.getDatabase()
  registerOnboardingHandlers(db)
  logger.info('IPC', 'Onboarding handlers registered')
}
```

**After** (new `index.ts`):
```typescript
import { IPCValidatorRegistry } from './ipc/validators/registry.js'
import { registerOnboardingValidators } from './ipc/validators/onboarding.js'

private setupIPCHandlers(): void {
  const db = DatabaseManager.getDatabase()

  // Register validators with automatic validation
  registerOnboardingValidators(IPCValidatorRegistry, db)
  logger.info('IPC', 'Onboarding validators registered')

  // Other domains will be registered as implemented...
}
```

### 5.3 Migration Phases

**Phase 1: Critical Handlers** (T014 - This task)
- ✅ Create infrastructure (registry, common schemas)
- ✅ Migrate onboarding channels (6 channels) - Security-sensitive
- ✅ Migrate settings channels (4 channels) - Config management
- ⏳ Leave other handlers for user story implementation

**Phase 2: User Story Implementation** (T018-T166)
- US1: Complete generation, reports validators
- US2: Complete notifications validators
- And so on for each user story...

**Benefits**:
- Security-critical paths validated immediately
- Work spread across implementation timeline
- Validators created alongside new features

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Location**: `tests/unit/main/ipc/validators/`

**Test Coverage**:
- ✅ Schema validation (valid cases accepted)
- ✅ Schema validation (invalid cases rejected)
- ✅ Error message formats
- ✅ Common schema reusability

**Example**: `tests/unit/main/ipc/validators/onboarding.validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  OnboardingDetectEmailClientRequestSchema,
  OnboardingSetStepRequestSchema
} from '@/main/ipc/validators/onboarding.js'

describe('Onboarding Validators', () => {
  describe('OnboardingDetectEmailClientRequestSchema', () => {
    const validCases = [
      { type: 'thunderbird' },
      { type: 'outlook' },
      { type: 'apple-mail' }
    ]

    const invalidCases = [
      { type: 'invalid-client' },
      { type: '' },
      {}, // missing field
      { type: 'thunderbird', extra: 'field' } // strict mode
    ]

    validCases.forEach((testCase) => {
      it(`should accept valid case: ${JSON.stringify(testCase)}`, () => {
        const result = OnboardingDetectEmailClientRequestSchema.safeParse(testCase)
        expect(result.success).toBe(true)
      })
    })

    invalidCases.forEach((testCase) => {
      it(`should reject invalid case: ${JSON.stringify(testCase)}`, () => {
        const result = OnboardingDetectEmailClientRequestSchema.safeParse(testCase)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('OnboardingSetStepRequestSchema', () => {
    it('should accept valid step 1 with email client', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 1,
        data: {
          emailClient: {
            type: 'thunderbird',
            path: '/path/to/profile'
          }
        }
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid step 2 with schedule', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 18, minute: 0 },
            skipWeekends: true
          }
        }
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid step number', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 5
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid hour value', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 2,
        data: {
          schedule: {
            generationTime: { hour: 25, minute: 0 },
            skipWeekends: true
          }
        }
      })
      expect(result.success).toBe(false)
    })

    it('should reject remote mode without HTTPS', () => {
      const result = OnboardingSetStepRequestSchema.safeParse({
        step: 3,
        data: {
          llm: {
            mode: 'remote',
            remoteEndpoint: 'http://api.example.com', // Not HTTPS
            apiKey: 'sk-12345678901234567890'
          }
        }
      })
      expect(result.success).toBe(false)
    })
  })
})
```

### 6.2 Integration Tests

**Location**: `tests/integration/ipc/validation.test.ts`

**Test Coverage**:
- ✅ IPC channel rejects invalid requests
- ✅ IPC channel accepts valid requests
- ✅ Response validation catches malformed responses
- ✅ Error messages are context-aware (dev vs prod)

**Example**:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BrowserWindow, ipcMain } from 'electron'
import { IPCValidatorRegistry } from '@/main/ipc/validators/registry.js'
import { registerOnboardingValidators } from '@/main/ipc/validators/onboarding.js'

describe('IPC Validation Integration', () => {
  let mainWindow: BrowserWindow
  let db: Database

  beforeEach(() => {
    // Setup test environment
    mainWindow = new BrowserWindow({ show: false })
    db = createTestDatabase()
  })

  afterEach(() => {
    // Cleanup
    ipcMain.removeAllListeners()
    mainWindow.close()
  })

  it('should reject invalid request from renderer', async () => {
    // Register validators
    registerOnboardingValidators(IPCValidatorRegistry, db)

    // Send invalid request
    const invalidRequest = { type: 'not-a-real-client' }

    await expect(
      mainWindow.webContents.send('onboarding:detect-email-client', invalidRequest)
    ).rejects.toThrow()
  })

  it('should accept valid request and return validated response', async () => {
    // Register validators
    registerOnboardingValidators(IPCValidatorRegistry, db)

    // Send valid request
    const validRequest = { type: 'thunderbird' }
    const response = await mainWindow.webContents.send(
      'onboarding:detect-email-client',
      validRequest
    )

    // Verify response matches schema
    expect(response).toHaveProperty('detectedPath')
    expect(response.detectedPath).toBeInstanceOf(String)
  })

  it('should provide detailed errors in development mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    registerOnboardingValidators(IPCValidatorRegistry, db)

    try {
      await mainWindow.webContents.send('onboarding:detect-email-client', {})
    } catch (error) {
      expect(error).toHaveProperty('field')
      expect(error).toHaveProperty('issues')
    }

    process.env.NODE_ENV = originalEnv
  })

  it('should provide generic errors in production mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    registerOnboardingValidators(IPCValidatorRegistry, db)

    try {
      await mainWindow.webContents.send('onboarding:detect-email-client', {})
    } catch (error) {
      expect(error).toHaveProperty('error')
      expect(error).not.toHaveProperty('field')
      expect(error).not.toHaveProperty('issues')
    }

    process.env.NODE_ENV = originalEnv
  })
})
```

### 6.3 Security Tests

**Location**: `tests/security/ipc-validation.test.ts`

**Test Coverage**:
- ✅ Validation cannot be bypassed
- ✅ Malicious payloads are rejected
- ✅ Sensitive data is not leaked in errors

**Example**:

```typescript
describe('IPC Security Validation', () => {
  it('should reject prototype pollution attempts', () => {
    const maliciousPayload = {
      step: 1,
      data: {
        __proto__: { isAdmin: true }
      }
    }

    const result = OnboardingSetStepRequestSchema.safeParse(maliciousPayload)
    expect(result.success).toBe(false)
  })

  it('should reject SQL injection attempts in paths', () => {
    const maliciousPath = "'; DROP TABLE users; --"

    const result = OnboardingValidateEmailPathRequestSchema.safeParse({
      path: maliciousPath
    })

    // Path is accepted by Zod (it's a string)
    // But handler should validate it doesn't contain SQL patterns
    expect(result.success).toBe(true)
    // Handler-level validation needed
  })

  it('should not leak sensitive data in error messages', () => {
    process.env.NODE_ENV = 'production'

    const result = OnboardingSetStepRequestSchema.safeParse({
      step: 3,
      data: {
        llm: {
          mode: 'remote',
          apiKey: 'sk-sensitive-key-12345'
        }
      }
    })

    if (!result.success) {
      const errorStr = JSON.stringify(result.error)
      expect(errorStr).not.toContain('sk-sensitive-key-12345')
    }
  })
})
```

---

## 7. Implementation Checklist

### 7.1 Foundation Infrastructure (T014 - Phase 1)

- [ ] Create `src/main/ipc/validators/` directory
- [ ] Implement `validators/registry.ts`:
  - [ ] `IPCValidatorRegistry` class
  - [ ] `wrapHandler()` method with validation logic
  - [ ] `createValidationError()` with context-aware messages
  - [ ] Comprehensive error logging
- [ ] Implement `validators/common.ts`:
  - [ ] `EmailClientTypeSchema`, `EmailClientConfigSchema`
  - [ ] `GenerationTimeSchema`, `ScheduleConfigSchema`
  - [ ] `LLMModeSchema`, `LLMConfigSchema`
  - [ ] `NotificationPrioritySchema`, `NotificationTypeSchema`
  - [ ] Response schemas (`SuccessResponseSchema`, `ErrorResponseSchema`)
- [ ] Add TypeScript types for `ValidatedHandler` interface
- [ ] Add export statements for all validators

### 7.2 Critical Handler Migration (T014 - Phase 1)

**Onboarding Validators** (6 channels):
- [ ] Implement `validators/onboarding.ts`:
  - [ ] `OnboardingGetStatusRequestSchema` & `ResponseSchema`
  - [ ] `OnboardingSetStepRequestSchema` & `ResponseSchema`
  - [ ] `OnboardingDetectEmailClientRequestSchema` & `ResponseSchema`
  - [ ] `OnboardingValidateEmailPathRequestSchema` & `ResponseSchema`
  - [ ] `OnboardingTestLLMConnectionRequestSchema` & `ResponseSchema`
  - [ ] `OnboardingAcknowledgeRequestSchema` & `ResponseSchema`
  - [ ] `registerOnboardingValidators()` function
- [ ] Refactor `handlers/onboardingHandler.ts`:
  - [ ] Extract pure handler functions (no IPC registration)
  - [ ] Export functions for validator to call
  - [ ] Add JSDoc comments
- [ ] Update `src/main/index.ts`:
  - [ ] Import `IPCValidatorRegistry` and `registerOnboardingValidators`
  - [ ] Replace old registration with validator registration
  - [ ] Test startup with new system

**Settings Validators** (4 channels):
- [ ] Implement `validators/settings.ts`:
  - [ ] `SettingsGetAllRequestSchema` & `ResponseSchema`
  - [ ] `SettingsUpdateRequestSchema` & `ResponseSchema`
  - [ ] `SettingsCleanupDataRequestSchema` & `ResponseSchema`
  - [ ] `SettingsDestroyFeedbackRequestSchema` & `ResponseSchema`
  - [ ] `registerSettingsValidators()` function
- [ ] Refactor existing settings logic (if exists)
- [ ] Update `index.ts` to register settings validators

### 7.3 Testing (T014 - Phase 1)

- [ ] Create `tests/unit/main/ipc/validators/` directory
- [ ] Unit tests for `common.ts` schemas:
  - [ ] Email client validation tests
  - [ ] Schedule validation tests
  - [ ] LLM config validation tests
  - [ ] Notification priority tests
- [ ] Unit tests for `onboarding.ts` validators:
  - [ ] All 6 channels tested
  - [ ] Valid case tests (positive)
  - [ ] Invalid case tests (negative)
  - [ ] Edge case tests (boundary values)
- [ ] Unit tests for `settings.ts` validators:
  - [ ] All 4 channels tested
  - [ ] Valid/invalid cases
- [ ] Integration tests for validation wrapper:
  - [ ] Invalid requests rejected
  - [ ] Valid requests accepted
  - [ ] Response validation works
- [ ] Integration tests for error messages:
  - [ ] Development mode shows details
  - [ ] Production mode shows generic errors
- [ ] Security tests:
  - [ ] Prototype pollution rejected
  - [ ] No sensitive data leaked

### 7.4 Documentation

- [ ] Add JSDoc comments to all validator files
- [ ] Document common schemas with usage examples
- [ ] Update IPC channels contract document with schema references
- [ ] Add architecture diagram to docs
- [ ] Update quickstart guide with validation rules

### 7.5 Future Phases (T018-T166)

**User Story 1 (T018-T032)**:
- [ ] Implement `validators/generation.ts` (3 channels)
- [ ] Implement `validators/reports.ts` (7 channels)

**User Story 2-9**:
- [ ] Implement remaining validators as needed
- [ ] Migrate remaining handlers incrementally

---

## 8. Success Criteria

T014 is complete when:

✅ **Functional Requirements**:
- All 21 IPC channels have Zod schemas defined
- `IPCValidatorRegistry` enforces validation on all registered handlers
- Invalid requests are rejected with structured errors
- Valid requests pass through to handlers
- Response validation catches malformed responses

✅ **Security Requirements**:
- Validation cannot be bypassed
- Sensitive data not leaked in error messages (production)
- Development mode provides detailed debugging info
- All security-critical handlers (onboarding, settings, LLM) validated first

✅ **Code Quality Requirements**:
- Type safety: TypeScript types inferred from Zod schemas
- Code coverage: ≥80% line, ≥70% branch (per constitution)
- No `any` types in validation layer
- Consistent error handling across all channels

✅ **Performance Requirements**:
- Validation overhead < 5ms per request
- No significant performance degradation
- Efficient schema parsing (Zod is fast)

---

## 9. Dependencies

### 9.1 Existing Dependencies

✅ **Already Installed**:
- `zod: ^3.22.4` - Runtime validation
- `better-sqlite3: ^11.10.0` - Database
- `electron: ^29.4.6` - IPC infrastructure

### 9.2 New Dependencies

**None** - All required packages already installed.

### 9.3 Task Dependencies

T014 depends on:
- ✅ T001-T007 (Setup phase) - Complete
- ✅ T008-T012 (Foundational phase) - Complete
- ✅ T013, T015-T017 (Parallel infrastructure) - Complete

T014 blocks:
- ⏳ T018-T032 (User Story 1) - Validators needed for generation/reports channels
- ⏳ T033-T166 (Remaining user stories) - Validators created incrementally

---

## 10. Risk Mitigation

### 10.1 Risks Identified

**Risk 1**: Breaking existing functionality during migration
- **Mitigation**: Hybrid approach - migrate critical handlers first, leave others for user stories
- **Fallback**: Keep old handlers alongside new during transition

**Risk 2**: Performance overhead from validation
- **Mitigation**: Zod is highly optimized, validation is fast (<5ms typical)
- **Monitoring**: Add performance metrics to ensure no degradation

**Risk 3**: Schema maintenance burden
- **Mitigation**: Schemas defined once, reused extensively; TypeScript prevents drift
- **Testing**: Automated tests catch schema contract violations

**Risk 4**: Developer adoption
- **Mitigation**: Clear documentation, consistent patterns, good error messages
- **Training**: Update quickstart guide with validation examples

### 10.2 Rollback Plan

If validation system causes issues:
1. Feature flag to disable validation layer
2. Fallback to direct IPC handler registration
3. Gradual re-enablement per domain

---

## 11. Open Questions

**Q1**: Should we add runtime performance monitoring to validation wrapper?
- **A**: Yes - Add timing metrics in development mode to track overhead

**Q2**: Should we generate TypeScript types from Zod schemas for renderer process?
- **A**: Yes - Export types from `validators/` for renderer to use

**Q3**: Should we add schema validation to preload script?
- **A**: Yes - Prevent invalid IPC calls from renderer

**Q4**: How to handle handler functions that need additional context (e.g., Database)?
- **A**: Pass context through factory function (see `registerOnboardingValidators(registry, db)` pattern)

---

## 12. References

- [Constitution v1.3.0](../../constitution.md) - Principle V: IPC Whitelist
- [Zod Documentation](https://zod.dev/) - Schema validation library
- [contracts/ipc-channels.md](../../specs/002-user-interaction-system/contracts/ipc-channels.md) - IPC channel contracts
- [plan.md](../../specs/002-user-interaction-system/plan.md) - Implementation plan
- [tasks.md](../../specs/002-user-interaction-system/tasks.md) - Task breakdown

---

## Appendix A: Complete Validator Example

Full implementation example for onboarding domain validator:

```typescript
/**
 * Onboarding Domain Validators
 *
 * Validates all onboarding-related IPC channels:
 * - onboarding:get-status
 * - onboarding:set-step
 * - onboarding:acknowledge
 * - onboarding:detect-email-client
 * - onboarding:validate-email-path
 * - onboarding:test-llm-connection
 */

import { z } from 'zod'
import { IPCValidatorRegistry } from './registry.js'
import { IPC_CHANNELS } from '../channels.js'
import * as handlers from '../handlers/onboardingHandler.js'
import type { Database } from 'better-sqlite3'

// ==================== COMMON IMPORTS ====================

import {
  EmailClientTypeSchema,
  GenerationTimeSchema,
  LLMModeSchema
} from './common.js'

// ==================== REQUEST/RESPONSE SCHEMAS ====================

/**
 * Channel: onboarding:get-status
 * Get current onboarding status and step
 */
export const OnboardingGetStatusRequestSchema = z
  .object({})
  .strict()

export const OnboardingStatusResponseSchema = z.object({
  completed: z.boolean(),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  canProceed: z.boolean()
})

/**
 * Channel: onboarding:set-step
 * Update onboarding step progress
 */
export const OnboardingSetStepRequestSchema = z
  .object({
    step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    data: z
      .object({
        emailClient: z
          .object({
            type: EmailClientTypeSchema,
            path: z.string().min(1, 'Path is required')
          })
          .optional(),
        schedule: z
          .object({
            generationTime: GenerationTimeSchema,
            skipWeekends: z.boolean()
          })
          .optional(),
        llm: z
          .object({
            mode: LLMModeSchema,
            localEndpoint: z.string().url().optional(),
            remoteEndpoint: z.string().url().optional(),
            apiKey: z.string().min(20, 'API key must be at least 20 characters').optional()
          })
          .optional()
      })
      .optional()
  })
  .strict()

export const OnboardingSetStepResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
})

/**
 * Channel: onboarding:acknowledge
 * Acknowledge first-run disclosure
 */
export const OnboardingAcknowledgeRequestSchema = z
  .object({})
  .strict()

export const OnboardingAcknowledgeResponseSchema = z.object({
  success: z.boolean()
})

/**
 * Channel: onboarding:detect-email-client
 * Auto-detect email client installation path
 */
export const OnboardingDetectEmailClientRequestSchema = z
  .object({
    type: EmailClientTypeSchema
  })
  .strict()

export const OnboardingDetectEmailClientResponseSchema = z.object({
  detectedPath: z.string().nullable(),
  error: z.string().optional()
})

/**
 * Channel: onboarding:validate-email-path
 * Validate email client path contains email files
 */
export const OnboardingValidateEmailPathRequestSchema = z
  .object({
    path: z.string().min(1, 'Path is required')
  })
  .strict()

export const OnboardingValidateEmailPathResponseSchema = z.object({
  valid: z.boolean(),
  message: z.string()
})

/**
 * Channel: onboarding:test-llm-connection
 * Test LLM API connectivity
 */
export const OnboardingTestLLMConnectionRequestSchema = z
  .object({
    mode: LLMModeSchema,
    localEndpoint: z.string().url().optional(),
    remoteEndpoint: z.string().url().optional(),
    apiKey: z.string().optional()
  })
  .strict()

export const OnboardingTestLLMConnectionResponseSchema = z.object({
  success: z.boolean(),
  responseTime: z.number(),
  error: z.string().optional()
})

// ==================== HANDLER REGISTRATION ====================

/**
 * Register all onboarding validators
 *
 * @param registry - IPCValidatorRegistry instance
 * @param db - Database instance for handlers
 */
export function registerOnboardingValidators(
  registry: typeof IPCValidatorRegistry,
  db: Database
): void {
  // Channel 1: Get status
  registry.register(
    IPC_CHANNELS.ONBOARDING_GET_STATUS,
    {
      requestSchema: OnboardingGetStatusRequestSchema,
      responseSchema: OnboardingStatusResponseSchema,
      handler: async () => handlers.handleGetStatus(db)
    }
  )

  // Channel 2: Set step
  registry.register(
    IPC_CHANNELS.ONBOARDING_SET_STEP,
    {
      requestSchema: OnboardingSetStepRequestSchema,
      responseSchema: OnboardingSetStepResponseSchema,
      handler: async (request) =>
        handlers.handleSetStep(db, request.step, request.data)
    }
  )

  // Channel 3: Acknowledge
  registry.register(
    IPC_CHANNELS.ONBOARDING_ACKNOWLEDGE,
    {
      requestSchema: OnboardingAcknowledgeRequestSchema,
      responseSchema: OnboardingAcknowledgeResponseSchema,
      handler: async () => handlers.handleAcknowledge(db)
    }
  )

  // Channel 4: Detect email client
  registry.register(
    IPC_CHANNELS.ONBOARDING_DETECT_EMAIL_CLIENT,
    {
      requestSchema: OnboardingDetectEmailClientRequestSchema,
      responseSchema: OnboardingDetectEmailClientResponseSchema,
      handler: async (request) =>
        handlers.handleDetectEmailClient(db, request.type)
    }
  )

  // Channel 5: Validate email path
  registry.register(
    IPC_CHANNELS.ONBOARDING_VALIDATE_EMAIL_PATH,
    {
      requestSchema: OnboardingValidateEmailPathRequestSchema,
      responseSchema: OnboardingValidateEmailPathResponseSchema,
      handler: async (request) =>
        handlers.handleValidateEmailPath(db, request.path)
    }
  )

  // Channel 6: Test LLM connection
  registry.register(
    IPC_CHANNELS.ONBOARDING_TEST_LLM_CONNECTION,
    {
      requestSchema: OnboardingTestLLMConnectionRequestSchema,
      responseSchema: OnboardingTestLLMConnectionResponseSchema,
      handler: async (request) =>
        handlers.handleTestLLMConnection(db, request)
    }
  )
}
```

---

## Appendix B: TypeScript Type Export Pattern

Export types from validators for renderer process use:

```typescript
// File: validators/onboarding.ts

// Export schemas
export const OnboardingGetStatusRequestSchema = ...

// Export inferred types
export type OnboardingGetStatusRequest = z.infer<typeof OnboardingGetStatusRequestSchema>
export type OnboardingStatusResponse = z.infer<typeof OnboardingStatusResponseSchema>

// Export all types
export type OnboardingRequests =
  | OnboardingGetStatusRequest
  | OnboardingSetStepRequest
  | ...

export type OnboardingResponses =
  | OnboardingStatusResponse
  | OnboardingSetStepResponse
  | ...

// Renderer can import types:
// import type { OnboardingStatusResponse } from '@/main/ipc/validators/onboarding'
```

---

**END OF DESIGN DOCUMENT**

This design is complete and ready for implementation planning. All key decisions have been made and approved. Next step: Invoke `writing-plans` skill to create detailed implementation plan.
