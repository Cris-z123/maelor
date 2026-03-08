# Design: User Story 1 Test Suite (T018-T021)

**Date:** 2026-03-08
**Feature:** User Interaction System - First-Time Setup and Configuration
**Tasks:** T018-T021 (Test implementation for User Story 1)

## Overview

This design document outlines the test suite for User Story 1 (First-Time Setup and Configuration), following a balanced testing approach that covers critical paths and main edge cases while deferring exhaustive testing to later iterations.

## Testing Strategy

### Approach
- **Philosophy:** Balanced - solid coverage of critical paths and main edge cases
- **Methodology:** Red-Green-Refactor (TDD) - all tests written first, must fail before implementation
- **Platform Testing:** Current-platform only - rely on CI/CD for multi-platform coverage
- **Component Testing:** True TDD - tests drive component design for non-existent components

### Coverage Targets
- Line coverage: ≥80%
- Branch coverage: ≥70%
- Per constitution v1.1.0 requirements

## Architecture

### Test Structure
```
tests/
├── unit/
│   └── main/
│       └── onboarding/
│           └── EmailClientDetector.test.ts  (T018, T019)
├── integration/
│   └── ipc/
│       └── onboarding.test.ts               (T020)
└── unit/
    └── renderer/
        └── components/
            └── onboarding/
                └── WelcomeScreen.test.tsx   (T021)
```

### Mocking Strategy
- **Electron APIs:** Mocked in `tests/setup.ts` (app, ipcMain, ipcRenderer)
- **File System:** Mocked with `vi.mock()` in test files
- **Database:** Mocked at handler level for integration tests
- **Platform Detection:** Test only current platform, skip others with clear messages

### Testing Principles
1. **Isolation:** Each test is independent with fresh mocks
2. **Clarity:** Descriptive test names that explain what is being tested
3. **Simplicity:** One assertion per test when possible
4. **Realism:** Mock only at boundaries, keep real logic intact

## Test Designs

### T018: EmailClientDetector.platformDefaults Tests

**Purpose:** Verify platform-specific default email client paths

**Coverage:** Current platform only (Windows/macOS/Linux)

**Test Cases:**
1. Return default paths for current platform
2. Include all three email clients (Thunderbird, Outlook, Apple Mail)
3. Return absolute paths with correct platform-specific prefix

**Assertions:**
- Structure: `toHaveProperty('thunderbird')`, `toHaveProperty('outlook')`, `toHaveProperty('appleMail')`
- Format: Match regex for Windows (`^[A-Z]:\\`) or Unix (`^/`) absolute paths
- Completeness: All three clients present in result

### T019: EmailClientDetector.validatePath Tests

**Purpose:** Validate email client path detection logic

**Coverage:** Balanced file system and application logic scenarios

**File System Edge Cases:**
1. Non-existent paths (ENOENT error)
2. Permission denied (EACCES error)
3. Empty directories (no email files)

**Application Logic Scenarios:**
1. Detect Thunderbird email files (.msf, .wdseml)
2. Detect Outlook email files (.pst, .ost)
3. Reject unsupported file types

**Assertions:**
- Valid paths: `valid: true`, correct `clientType`
- Invalid paths: `valid: false`, descriptive `error` message
- Empty directories: Error message mentions "no email files"
- Unsupported types: Error message mentions "unsupported email client"

### T020: Onboarding IPC Integration Tests

**Purpose:** Verify IPC channel communication for onboarding workflow

**Mocking:** Database operations mocked at handler level

**Channels Tested:**

#### onboarding:get-status
- Return current onboarding status
- Handle first-time user (no prior status)
- Validate status structure (completed, currentStep, totalSteps)

#### onboarding:set-step
- Advance to next step with validation
- Reject invalid step names
- Prevent skipping steps (validation error)

#### onboarding:detect-email-client
- Auto-detect email clients on current platform
- Return empty array when no clients detected
- Include platform in response

#### onboarding:validate-email-path
- Validate valid email client path
- Return detailed error for invalid paths
- Include error message and suggestion

#### onboarding:test-llm-connection
- Successfully test remote LLM connection
- Handle connection timeout (30 seconds)
- Validate required config parameters

**Assertions:**
- IPC handlers called with correct parameters
- Response structures match expected schemas
- Error handling with specific error messages
- Timeout handling with increased test timeout (35s)

### T021: WelcomeScreen Component Tests

**Purpose:** Verify welcome screen UI and user interaction flow

**Component Interface:**
```typescript
interface WelcomeScreenProps {
  onNext?: () => void;
}
```

**Coverage:** Critical user interaction path + basic UI validation

#### Rendering Tests
1. Render welcome message and app introduction
2. Display acknowledgment button
3. Verify ARIA labels for accessibility

#### User Interaction Flow Tests
1. Request file system permissions on acknowledge button click
2. Transition to email client config step after permissions granted
3. Show permission denied message and retry option
4. Display loading state during permission request

#### Error Handling Tests
1. Handle IPC communication errors gracefully
2. Provide fallback when permissions API unavailable

#### Keyboard Navigation Tests
1. Acknowledge on Enter key press
2. Do not trigger on other key presses

**Assertions:**
- UI elements present with correct text/content
- IPC calls made with correct channel names
- Navigation/transitions occur after successful actions
- Loading states displayed appropriately
- Error messages shown for failures
- ARIA attributes present for accessibility
- Keyboard events handled correctly

## Dependencies

### Required Files
- `src/main/onboarding/EmailClientDetector.ts` - exists
- `src/main/ipc/handlers/onboardingHandler.ts` - exists
- `src/renderer/components/onboarding/WelcomeScreen.tsx` - to be created in T023

### Test Infrastructure
- Vitest configuration (`vitest.config.ts`)
- Test setup (`tests/setup.ts`)
- Happy-DOM for component testing
- Mocked Electron APIs

## Success Criteria

### Test Execution
- All tests fail initially (Red phase)
- Tests pass after implementation (Green phase)
- Code remains clean after refactoring (Refactor phase)

### Coverage
- Line coverage ≥80%
- Branch coverage ≥70%
- All critical paths covered
- Main edge cases addressed

### Quality
- Tests are independent and isolated
- Test names clearly describe what is tested
- Mocks are appropriate and minimal
- Error messages are specific and helpful

## Implementation Notes

### Test File Creation Order
1. T018 & T019: `EmailClientDetector.test.ts` (can be done in parallel)
2. T020: `onboarding.test.ts` (integration test)
3. T021: `WelcomeScreen.test.tsx` (component test for non-existent component)

### Running Tests
```bash
# Run all User Story 1 tests
pnpm test tests/unit/main/onboarding/EmailClientDetector.test.ts
pnpm test tests/integration/ipc/onboarding.test.ts
pnpm test tests/unit/renderer/components/onboarding/WelcomeScreen.test.tsx

# Run with coverage
pnpm test:coverage

# Run specific test suite
pnpm test --grep "EmailClientDetector"
```

### Next Steps
After this design is approved and documented:
1. Invoke writing-plans skill to create detailed implementation plan
2. Execute implementation tasks in order
3. Verify tests fail before implementation
4. Implement corresponding source code
5. Verify tests pass after implementation
6. Update tasks.md to mark T018-T021 as complete

## References

- Task definitions: `specs/002-user-interaction-system/tasks.md` (T018-T021)
- Testing requirements: Constitution v1.1.0
- IPC channels: `specs/002-user-interaction-system/contracts/ipc-channels.md`
- Onboarding workflow: `specs/002-user-interaction-system/spec.md` (User Story 1)
