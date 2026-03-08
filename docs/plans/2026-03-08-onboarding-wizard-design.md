# Onboarding Wizard Design Document

**Date**: 2026-03-08
**Feature**: User Story 1 - First-Time Setup and Configuration
**Tasks**: T022-T032
**Status**: Approved
**Architecture**: Option A - Minimal Refactor

---

## Executive Summary

Implement a 3-step onboarding wizard for first-time users to configure mailCopilot. The wizard guides users through email client detection, schedule configuration, and LLM setup with real-time validation, permission handling, and graceful error recovery.

**Key Design Decisions:**
- Minimal refactor approach - complete TODOs, keep existing IPC structure
- No resume from incomplete steps - start fresh each time (per user requirement)
- Zustand store without persistence (clean state on each launch)
- Graceful degradation for denied permissions
- 30-second timeout for LLM connection tests

---

## Table of Contents

1. [Backend Completions](#section-1-backend-completions)
2. [Frontend State Management](#section-2-frontend-state-management)
3. [Component Architecture](#section-3-component-architecture)
4. [Step Components Detail](#section-4-step-components-detail)
5. [Permission Manager](#section-5-permission-manager)
6. [First Launch Detection](#section-6-first-launch-detection)
7. [Data Flow & IPC Integration](#section-7-data-flow--ipc-integration)
8. [Error Handling Strategy](#section-8-error-handling-strategy)
9. [Testing Strategy](#section-9-testing-strategy)
10. [Implementation Order](#section-10-implementation-order)

---

## Section 1: Backend Completions

### 1.1 OnboardingManager TODO Completions (T027)

**File**: `src/main/onboarding/OnboardingManager.ts`

**getStatus() Implementation:**
```typescript
static async getStatus() {
  const state = this.getState();
  return {
    completed: state.completed,
    currentStep: `step-${state.currentStep}`, // Map 1/2/3 to step-1/step-2/step-3
    totalSteps: 3
  };
}
```

**setStep() Implementation:**
```typescript
static async setStep(stepName: string) {
  const stepMap: Record<string, 1 | 2 | 3> = {
    'step-1': 1,
    'step-2': 2,
    'step-3': 3,
  };
  const stepNum = stepMap[stepName];
  if (!stepNum) throw new Error('Invalid step name');

  this.updateState({ currentStep: stepNum });
  return true;
}
```

**Integration Points:**
- Uses existing `getState()` and `updateState()` methods
- Maintains compatibility with existing database encryption
- Preserves test coverage from T018-T021

---

### 1.2 LLM Connection Tester (T028)

**New File**: `src/main/llm/ConnectionTester.ts`

**Features:**
- 30-second timeout using AbortController
- Actual API call to test endpoint
- Response time tracking (milliseconds)
- Model detection (returns model name)
- Error handling for timeout, network errors, invalid API keys

**Interface:**
```typescript
class ConnectionTester {
  static async testConnection(config: {
    mode: 'local' | 'remote'
    endpoint: string
    apiKey?: string
  }): Promise<{
    success: boolean
    responseTime?: number
    model?: string
    error?: string
  }>
}
```

**Timeout Implementation:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(config.endpoint, {
    signal: controller.signal,
    headers: { 'Authorization': `Bearer ${config.apiKey}` }
  });
  clearTimeout(timeoutId);
  // ... process response
} catch (error) {
  if (error.name === 'AbortError') {
    return { success: false, error: 'Connection timeout (30s)' };
  }
}
```

---

### 1.3 Step Validation Logic (T029)

**Enhanced OnboardingManager.updateState():**

**Existing Validation (Keep):**
- ✅ Email client must be validated before step 2
- ✅ LLM connection must succeed before completion
- ✅ Schedule time validation (0-23 hour, 0-59 minute)

**New Validation (Add):**
```typescript
// Step 1 → 2: Email path validation
if (updated.currentStep >= 2 && !updated.emailClient.validated) {
  throw new Error('Email client path must be validated before proceeding');
}

// Step 2 → 3: Schedule configuration check
if (updated.currentStep >= 3) {
  if (!updated.schedule.generationTime ||
      updated.schedule.generationTime.hour < 0 ||
      updated.schedule.generationTime.hour > 23) {
    throw new Error('Invalid schedule configuration');
  }
}

// Completion: LLM connection required
if (updated.completed && updated.llm.connectionStatus !== 'success') {
  throw new Error('LLM connection must succeed before completion');
}
```

---

## Section 2: Frontend State Management

### 2.1 Onboarding Store (T022)

**New File**: `src/renderer/stores/onboardingStore.ts`

**State Structure:**
```typescript
interface OnboardingStore {
  // Current wizard state
  currentStep: 1 | 2 | 3
  isComplete: boolean

  // Step 1: Email client config
  emailClient: {
    type: 'thunderbird' | 'outlook' | 'apple-mail'
    path: string
    detectedPath: string | null
    isValid: boolean
    isDetecting: boolean
  }

  // Step 2: Schedule config
  schedule: {
    hour: number
    minute: number
    skipWeekends: boolean
  }

  // Step 3: LLM config
  llm: {
    mode: 'local' | 'remote'
    localEndpoint: string
    remoteEndpoint: string
    apiKey: string
    isTesting: boolean
    connectionStatus: 'idle' | 'testing' | 'success' | 'failed'
    responseTime?: number
  }

  // UI state
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentStep: (step: 1 | 2 | 3) => void
  setEmailClientType: (type: string) => void
  setEmailClientPath: (path: string) => void
  detectEmailClient: () => Promise<void>
  validateEmailPath: (path: string) => Promise<boolean>
  setScheduleTime: (hour: number, minute: number) => void
  setSkipWeekends: (skip: boolean) => void
  setLLMMode: (mode: 'local' | 'remote') => void
  setLLMEndpoint: (endpoint: string) => void
  setAPIKey: (key: string) => void
  testLLMConnection: () => Promise<void>
  completeOnboarding: () => Promise<void>
  reset: () => void
}
```

**Key Design Decisions:**
- Zustand with no persistence (per "start fresh" requirement)
- All async actions with try-catch error handling
- Loading states for async operations (detecting, testing)
- Validation state tracking (isValid, connectionStatus)
- Error messages in store for consistent error display

---

## Section 3: Component Architecture

### 3.1 Component Hierarchy

```
OnboardingWizard (container, T030)
├── WelcomeScreen (T023)
├── EmailClientConfig (T024)
├── ScheduleConfig (T025)
└── LLMConfig (T026)
```

### 3.2 OnboardingWizard Container (T030)

**File**: `src/renderer/components/onboarding/OnboardingWizard.tsx`

**Responsibilities:**
- Step navigation and progression
- Progress indicator (1/3, 2/3, 3/3)
- Back/Next button management
- Validation before step transitions
- Integration with onboardingStore

**Key Features:**
- Auto-detect first launch and show wizard
- Prevent proceeding without validation:
  - Step 1 → 2 needs valid email path
  - Step 2 → 3 needs schedule configuration
  - Step 3 → Complete needs LLM connection success
- Show loading states during async operations
- Error banner for validation failures
- Keyboard shortcuts (Esc to cancel, Enter to proceed)

---

## Section 4: Step Components Detail

### 4.1 WelcomeScreen Component (T023)

**File**: `src/renderer/components/onboarding/WelcomeScreen.tsx`

**Purpose**: App introduction + file system permission requests

**UI Wireframe:**
```
+-----------------------------------------------------+
|  [mailCopilot Logo]                                 |
|  欢迎使用 mailCopilot                                |
|  智能邮件分析和管理工具                              |
|                                                      |
|  为了正常使用,我们需要:                              |
|  ✓ 读取您的邮件文件                                  |
|  ✓ 生成每日报告                                      |
|  [✓] 所有数据处理均在本地完成                        |
|                                                      |
|  [ 文件系统访问权限 ]  [ 通知权限 ]                 |
|  状态: ✓ 已授权     状态: ✓ 已授权                   |
|                                                      |
|                        [ 我知道了,开始配置 > ]        |
+-----------------------------------------------------+
```

**Key Features:**
- Permission request buttons (file system, notifications)
- Show current permission status (granted/denied/pending)
- Disable "Next" until file system permission granted
- Graceful degradation if notifications denied
- Privacy-first messaging (per Constitution Principle I)

---

### 4.2 EmailClientConfig Component (T024)

**File**: `src/renderer/components/onboarding/EmailClientConfig.tsx`

**UI Wireframe:**
```
+-----------------------------------------------------+
|  [邮件图标] 配置邮件客户端                            |
+-----------------------------------------------------+
|  选择您的邮件客户端:                                  |
|  +-----------------------------------------------+   |
|  | (o) Thunderbird  ( ) Outlook  ( ) Apple Mail   |   |
|  +-----------------------------------------------+   |
|                                                      |
|  [自动检测中...]  ✓ 检测到:                          |
|  C:\Users\xxx\AppData\...\Thunderbird                |
|  找到 142 个邮件文件                                  |
|                                                      |
|  [ 修改路径 ]                                        |
|                                                      |
|  路径: [________________________]  [浏览...]        |
|                                                      |
|  [i] 支持 .msf, .mbx, .mbox 格式                     |
+-----------------------------------------------------+
```

**Interaction Flow:**
1. User selects client type → triggers auto-detection
2. If detection succeeds → show path with green checkmark, enable Next
3. If detection fails → show manual path input
4. User can click "Browse" to open file dialog
5. On path change → validate via `onboarding:validate-email-path` (debounce 500ms)
6. Show success/error state with file count

---

### 4.3 ScheduleConfig Component (T025)

**File**: `src/renderer/components/onboarding/ScheduleConfig.tsx`

**UI Wireframe:**
```
+-----------------------------------------------------+
|  [时钟图标] 配置每日报告生成规则                      |
+-----------------------------------------------------+
|  每日生成时间:                                       |
|  [▼ 18] : [▼ 00]                                    |
|                                                      |
|  [x] 跳过周六日                                       |
|  [i] 周六日判定基于本地系统时间                       |
|                                                      |
|  预览:                                               |
|  系统将在每天 18:00 自动生成报告                      |
|  (周六日除外)                                        |
+-----------------------------------------------------+
```

**Key Features:**
- Two dropdown selectors: hour (0-23), minute (0-59)
- Default: 18:00 (6 PM)
- Skip weekends checkbox (default: checked)
- Live preview of schedule
- Validation: hour 0-23, minute 0-59
- Simple and minimal (no complex recurrence rules per MVP)
- No async operations needed

---

### 4.4 LLMConfig Component (T026)

**File**: `src/renderer/components/onboarding/LLMConfig.tsx`

**UI Wireframe:**
```
+-----------------------------------------------------+
|  [AI图标] 选择AI处理模式                             |
+-----------------------------------------------------+
|  +-----------------------------------------------+   |
|  | (•) 远程模式 (推荐)  ( ) 本地模式               |   |
|  +-----------------------------------------------+   |
|                                                      |
|  API地址:                                            |
|  [https://api.openai.com/v1_______________]         |
|                                                      |
|  API密钥:                                            |
|  [sk-********************************_____][👁️]     |
|                                                      |
|  [ 测试连接 ]  ✓ 状态: 连接成功 (234ms)              |
|  [!] 模型: gpt-4                                     |
|                                                      |
|  [i] 您的密钥将被加密存储在本地                        |
+-----------------------------------------------------+
```

**Key Features:**
- Mode switch: Remote (default) vs Local
- Endpoint input (pre-filled with defaults)
- API key input with show/hide toggle
- "Test Connection" button with loading state
- Connection status display:
  - Idle: "未测试"
  - Testing: spinner + "测试中..."
  - Success: "[OK] 连接成功 (234ms)"
  - Failed: "[X] 连接失败: {error}"
- Model detection after successful connection
- Next button disabled until connection succeeds

**Validation Rules:**
- Remote mode: endpoint must be valid HTTPS URL, API key required (min 20 chars)
- Local mode: endpoint must be valid HTTP URL (no API key)
- Test connection timeout: 30 seconds

---

## Section 5: Permission Manager

### 5.1 PermissionManager Implementation (T031)

**New File**: `src/main/onboarding/PermissionManager.ts`

**Purpose**: Handle file system and notification permissions with graceful fallback

**Interface:**
```typescript
class PermissionManager {
  // Request file system access
  static async requestFileSystemAccess(): Promise<{
    granted: boolean
    restrictedMode: boolean  // True if denied
  }>

  // Request notification permission
  static async requestNotificationPermission(): Promise<boolean>

  // Check current permission status
  static async checkPermissions(): Promise<{
    fileSystem: 'granted' | 'denied' | 'prompt'
    notifications: 'granted' | 'denied' | 'prompt'
  }>
}
```

**Restricted Mode Fallback:**
- If file system access denied → Show warning but allow proceeding
- Store flag in user_config: `permissions_restricted: true`
- Wizard proceeds but user can't select email path via browser
- Show "请手动输入邮件路径" instead of file browser
- Allow typing path directly in text input

**Electron APIs Used:**
- `dialog.showOpenDialog()` for file browser
- `Notification.requestPermission()` for notifications

**Behavior Decision**: Option A - Graceful degradation (allow wizard completion with warning)

---

## Section 6: First Launch Detection

### 6.1 Main Process Integration (T032)

**File**: `src/main/index.ts`

**Implementation:**
```typescript
// In app.whenReady() handler
async function handleAppReady() {
  // Check if onboarding complete
  const { OnboardingManager } = await import('./onboarding/OnboardingManager');

  if (!OnboardingManager.isComplete()) {
    // Show onboarding wizard
    createOnboardingWindow();
  } else {
    // Show main window
    createMainWindow();
  }
}
```

**Window Configuration:**
```typescript
function createOnboardingWindow() {
  const window = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    resizable: false,  // Fixed size during wizard
    alwaysOnTop: true,  // Prevent getting lost
    autoHideMenuBar: true,  // Disable menu bar
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  window.loadFile('onboarding.html');
  return window;
}
```

---

## Section 7: Data Flow & IPC Integration

### 7.1 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                     │
├─────────────────────────────────────────────────────────┤
│  OnboardingWizard                                       │
│       │                                                 │
│       ├─→ WelcomeScreen ──→ PermissionManager.request() │
│       │                                                 │
│       ├─→ EmailClientConfig ──→ invoke('onboarding:detect-email-client')
│       │                         └─→ invoke('onboarding:validate-email-path')
│       │                                                 │
│       ├─→ ScheduleConfig ──→ (local state only)         │
│       │                                                 │
│       └─→ LLMConfig ──→ invoke('onboarding:test-llm-connection')
│                           └─→ invoke('onboarding:set-step')
│                                                             │
└───────────────────────────────────────────────────────────┘
                            │
                    IPC Channels (validated)
                            │
┌───────────────────────────────────────────────────────────┐
│                    Main Process                           │
├───────────────────────────────────────────────────────────┤
│  OnboardingManager (business logic)                       │
│       │                                                   │
│       ├─→ getState() / updateState()                      │
│       ├─→ EmailClientDetector.validatePathAsync()        │
│       └─→ ConnectionTester.testConnection()              │
│       │                                                   │
│       └─→ Database (user_config table, encrypted)        │
└───────────────────────────────────────────────────────────┘
```

### 7.2 IPC Channel Mapping

| Frontend Action | IPC Channel | Handler | Response |
|----------------|-------------|---------|----------|
| Detect email client | `onboarding:detect-email-client` | OnboardingManager.detectEmailClient() | `{clients[], platform}` |
| Validate path | `onboarding:validate-email-path` | OnboardingManager.validateEmailPath() | `{valid, error?, clientType?}` |
| Test LLM | `onboarding:test-llm-connection` | ConnectionTester.test() | `{success, responseTime, error?, model?}` |
| Complete step | `onboarding:set-step` | OnboardingManager.updateState() | `{success}` |
| Check status | `onboarding:get-status` | OnboardingManager.getState() | `{completed, currentStep, totalSteps}` |

---

## Section 8: Error Handling Strategy

### 8.1 Error Categories & Handling

**Validation Errors (User-correctable):**
- Invalid email path → Show error message below input, keep user on step
- Invalid time input → Show inline error, auto-correct to valid range
- Missing API key → Show "必填项" label, disable Next button
- Connection timeout → Show "连接超时(30s),请检查网络", offer Retry button

**System Errors (Graceful degradation):**
- safeStorage unavailable → Log warning, show error dialog, offer "退出" or "继续(不加密)"
- Database write failure → Show error with "重试" and "退出" options
- File system access denied → Enter restricted mode, show warning banner
- Permission manager crash → Log error, allow manual path entry

**Critical Errors (Block completion):**
- All LLM connection tests fail → Show "无法连接到AI服务", prevent completion
- No email clients detected → Show "未检测到邮件客户端", allow manual path
- Disk space < 100MB → Show "磁盘空间不足", block completion

### 8.2 Error Display Components

```typescript
<ErrorBanner type="error" message="路径无效或未找到邮件文件" />
<ErrorBanner type="warning" message="检测失败,请手动选择路径" />
<ErrorBanner type="info" message="正在测试连接..." />
```

---

## Section 9: Testing Strategy

### 9.1 Test Coverage Requirements

**Unit Tests (Already Complete - T018-T021):**
- ✅ EmailClientDetector.platformDefaults
- ✅ EmailClientDetector.validatePath
- ✅ Onboarding IPC integration
- ✅ WelcomeScreen component

**New Unit Tests Needed:**
- ConnectionTester.test() (timeout, success, failure scenarios)
- OnboardingStore actions (setCurrentStep, setEmailClientPath, etc.)
- PermissionManager (granted, denied, restricted modes)

**Integration Tests Needed:**
- Complete wizard flow (start → finish)
- Permission request flow
- Step validation logic
- First launch detection

### 9.2 Manual Testing Checklist

- [ ] Fresh install shows wizard
- [ ] All three email clients can be detected (Windows/macOS/Linux)
- [ ] Manual path selection works
- [ ] Invalid path shows error
- [ ] Schedule configuration persists
- [ ] Remote mode connection test works
- [ ] Local mode connection works
- [ ] Invalid API key shows error
- [ ] Connection timeout shows error
- [ ] Completed wizard shows main window
- [ ] Restarting app skips wizard
- [ ] Restricted mode works when permissions denied

---

## Section 10: Implementation Order

### 10.1 Task Execution Sequence

**Phase 1: Backend Completions (Foundation)**
```
T028: ConnectionTester.ts (new file, no dependencies)
T027: Complete OnboardingManager TODOs (depends on T028)
T029: Add step validation logic (depends on T027)
T031: PermissionManager.ts (can work in parallel with T027-T029)
```

**Phase 2: Frontend State**
```
T022: onboardingStore.ts (depends on nothing)
```

**Phase 3: Components**
```
T023: WelcomeScreen (can start after T022)
T024: EmailClientConfig (can start after T022)
T025: ScheduleConfig (can start after T022)
T026: LLMConfig (can start after T022)
T030: OnboardingWizard container (depends on T023-T026)
```

**Phase 4: Integration**
```
T032: First launch detection in main.ts (depends on T030)
```

### 10.2 Parallel Execution Opportunities

**Can be built simultaneously:**
- T023, T024, T025, T026 (all components, independent)
- T027, T028, T029, T031 (all backend, independent)

### 10.3 Estimated Effort

- Backend (T027-T029, T031): 4-6 hours
- Store (T022): 1-2 hours
- Components (T023-T026, T030): 6-8 hours
- Integration (T032): 1-2 hours
- **Total: 12-18 hours**

---

## Appendix A: Design Decisions

### A.1 Architectural Approach

**Decision**: Option A - Minimal Refactor

**Rationale**:
- Completes TODOs in OnboardingManager
- Builds new frontend components
- Keeps existing IPC structure
- Maintains test coverage (T018-T021 remain valid)
- Fastest path to working wizard

**Trade-offs**:
- ✅ Minimal risk, maximum speed
- ⚠️ Some API inconsistency remains (can fix in V2)
- ⚠️ Dual handler versions persist temporarily

### A.2 Resume Behavior

**Decision**: No resume from incomplete steps - start fresh each time

**Rationale**:
- Per user requirement
- Simpler state management
- Cleaner user experience for testing

### A.3 Permission Strategy

**Decision**: Graceful degradation (Option A)

**Rationale**:
- Allow wizard completion even with denied permissions
- Provide manual path input as fallback
- Better UX than blocking completely

### A.4 Local Mode Testing

**Decision**: Skip connection test for local mode, mark as success automatically

**Rationale**:
- Local mode is trusted (runs on user's machine)
- Connection test adds no value for localhost
- Faster user experience

### A.5 Completion Trigger

**Decision**: Explicit "完成" button after step 3 LLM test succeeds

**Rationale**:
- Clear user intent
- Prevents accidental completion
- Allows review before finalizing

---

## Appendix B: Open Questions Resolved

### B.1 Restricted Mode Behavior

**Question**: If user denies file system permission, should we allow wizard completion?

**Answer**: Yes, with graceful degradation
- Show warning banner throughout wizard
- Disable file browser dialog
- Allow manual path entry in text input
- Store `permissions_restricted: true` flag

### B.2 LLM Test on Local Mode

**Question**: Should we require successful connection test for local mode?

**Answer**: No, skip test and mark as success automatically
- Local endpoint is trusted (localhost)
- No need to verify connectivity
- Improves user experience

### B.3 Completion Trigger

**Question**: When should onboarding be marked complete?

**Answer**: Explicit "完成" button click after step 3
- Step 3 LLM test must succeed first
- User clicks "完成" button
- Clear intent, prevents accidental completion

---

## Appendix C: Dependencies & Integration Points

### C.1 Existing Code Dependencies

**Backend:**
- `src/main/onboarding/OnboardingManager.ts` - Complete TODOs
- `src/main/onboarding/EmailClientDetector.ts` - Use as-is
- `src/main/database/Database.js` - Access via OnboardingManager
- `src/main/config/logger.ts` - Use for logging

**IPC:**
- `src/main/ipc/handlers/onboardingHandler.ts` - Use V2 handlers
- `src/main/ipc/validators/onboarding.ts` - Already registered
- `src/main/ipc/channels.ts` - Channel definitions

**Frontend:**
- `src/renderer/services/ipc.ts` - IPC client abstraction
- `src/renderer/stores/middleware/encryptedPersistence.ts` - NOT used (no persistence)

### C.2 New Files to Create

**Backend (4 files):**
1. `src/main/llm/ConnectionTester.ts` (T028)
2. `src/main/onboarding/PermissionManager.ts` (T031)
3. Update: `src/main/onboarding/OnboardingManager.ts` (T027, T029)
4. Update: `src/main/index.ts` (T032)

**Frontend (6 files):**
1. `src/renderer/stores/onboardingStore.ts` (T022)
2. `src/renderer/components/onboarding/WelcomeScreen.tsx` (T023, replace existing)
3. `src/renderer/components/onboarding/EmailClientConfig.tsx` (T024)
4. `src/renderer/components/onboarding/ScheduleConfig.tsx` (T025)
5. `src/renderer/components/onboarding/LLMConfig.tsx` (T026)
6. `src/renderer/components/onboarding/OnboardingWizard.tsx` (T030)

---

## Appendix D: Risk Mitigation

### D.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| safeStorage unavailable | Medium | Show error dialog, offer unencrypted mode |
| Permission denied by OS | Low | Restricted mode with manual input |
| LLM connection timeout | Medium | Clear error message, retry button |
| Database corruption | Low | OnboardingManager has try-catch, returns defaults |

### D.2 UX Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| User gets stuck on step 1 | High | Provide manual path input, clear error messages |
| User doesn't have email client | Medium | Allow proceeding with warning (can add later) |
| Connection test fails repeatedly | High | Offer "稍后配置" option, skip for now |

### D.3 Testing Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Insufficient test coverage | Medium | Add unit tests for ConnectionTester, OnboardingStore |
| Manual testing gaps | Low | Comprehensive manual testing checklist |
| Platform-specific issues | Medium | Test on Windows, macOS, Linux |

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-08 | Initial design document for T022-T032 |

---

**Next Steps:**
1. ✅ Design approved
2. ⏳ Invoke `writing-plans` skill to create detailed implementation plan
3. ⏳ Execute implementation following task order
4. ⏳ Test and validate
5. ⏳ Commit and merge

**Design Approved By**: User (2026-03-08)
