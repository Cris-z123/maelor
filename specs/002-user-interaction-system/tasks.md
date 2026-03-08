# Tasks: User Interaction System

**Input**: Design documents from `/specs/002-user-interaction-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This project follows the constitution's testing requirements (≥80% line, ≥70% branch coverage). Test tasks are included for each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an Electron desktop application with main/renderer process separation:
- **Main process**: `src/main/` (backend logic)
- **Renderer process**: `src/renderer/` (frontend UI)
- **Shared**: `src/shared/` (types, schemas)
- **Tests**: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for user interaction system

- [X] T001 Create directory structure for user interaction system in src/main/onboarding/, src/main/notifications/, src/renderer/components/{onboarding,reports,generation,history,settings,shared}/, src/renderer/stores/, src/renderer/services/, src/renderer/hooks/
- [X] T002 Install and configure shadcn/ui components (Calendar, Dialog, Input, Button, Progress, Toast) following constitution-required Tailwind CSS v3.4 setup
- [X] T003 [P] Configure Zustand 4.5 with persistence middleware for encrypted state storage
- [X] T004 [P] Create Zod schema base templates in src/shared/schemas/ for runtime validation
- [X] T005 [P] Setup IPC client abstraction layer in src/renderer/services/ipc.ts for type-safe communication
- [X] T006 [P] Create shared TypeScript type definitions in src/shared/types/{onboarding,reports,history,settings}.ts
- [X] T007 [P] Configure Inter font family and custom theme (智捷蓝 #4F46E5, etc.) in src/renderer/styles/theme.css per visual design specifications

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Extend database schema with user_config table for onboarding state, notification settings, and display preferences per data-model.md in src/main/database/migrations/002-add-user-interaction-tables.sql
- [X] T009 [P] Add feedback_type column to todo_items table per constitution v1.3.0 in src/main/database/migrations/003-add-feedback-type.sql
- [X] T010 [P] Create FTS5 full-text search virtual table todo_items_fts with triggers for search optimization per research.md decision #4 in src/main/database/migrations/004-add-fts5-search.sql
- [X] T011 Implement OnboardingManager in src/main/onboarding/OnboardingManager.ts for tracking wizard state and persisting configuration
- [X] T012 [P] Implement EmailClientDetector in src/main/onboarding/EmailClientDetector.ts with platform-specific auto-detection per research.md decision #1
- [X] T013 [P] Implement NotificationManager in src/main/notifications/NotificationManager.ts with do-not-disturb and aggregation per research.md decision #2
- [X] T014 [P] Create IPC handler registration with Zod validation in src/main/ipc/validators/ for all 21 channels defined in contracts/ipc-channels.md
- [X] T015 [P] Implement error handling middleware with specific error messages (invalid path, LLM connection failure, insufficient disk space) per FR-080 to FR-089 in src/main/error-handler.ts
- [X] T016 [P] Create structured logging system excluding sensitive data in src/main/logger.ts for observability per constitution VII
- [X] T017 [P] Setup Electron safeStorage integration for field-level encryption of sensitive config values in src/main/config/ConfigManager.ts

---

## Phase 3: User Story 1 - First-Time Setup and Configuration (Priority: P1) 🎯 MVP

**Goal**: Guide new users through a 3-step configuration wizard (email client detection, schedule settings, LLM configuration) on first launch

**Independent Test**: Install fresh copy, complete 3-step wizard, verify main interface appears with proper empty state messaging

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US1] Unit test for EmailClientDetector.platformDefaults in tests/unit/main/onboarding/EmailClientDetector.test.ts covering Windows/macOS/Linux path detection
- [X] T019 [P] [US1] Unit test for EmailClientDetector.validatePath in tests/unit/main/onboarding/EmailClientDetector.test.ts covering invalid path, no email files scenarios
- [X] T020 [P] [US1] Integration test for onboarding IPC channels (onboarding:get-status, onboarding:set-step, onboarding:detect-email-client, onboarding:validate-email-path, onboarding:test-llm-connection) in tests/integration/ipc/onboarding.test.ts
- [X] T021 [P] [US1] Component test for WelcomeScreen in tests/unit/renderer/components/onboarding/WelcomeScreen.test.tsx

### Implementation for User Story 1

- [X] T022 [P] [US1] Create onboardingStore in src/renderer/stores/onboardingStore.ts with Zustand for tracking currentStep, emailClient config, schedule, llm config
- [X] T023 [P] [US1] Create WelcomeScreen component in src/renderer/components/onboarding/WelcomeScreen.tsx with app introduction and file system permission requests
- [X] T024 [P] [US1] Create EmailClientConfig component in src/renderer/components/onboarding/EmailClientConfig.tsx with radio buttons (Thunderbird/Outlook/Apple Mail), auto-detection display, manual path selection
- [X] T025 [P] [US1] Create ScheduleConfig component in src/renderer/components/onboarding/ScheduleConfig.tsx with time picker (hour/minute), skip weekends toggle
- [X] T026 [P] [US1] Create LLMConfig component in src/renderer/components/onboarding/LLMConfig.tsx with mode switch (remote/local), endpoint inputs, API key field, test connection button
- [X] T027 [US1] Implement onboarding IPC handlers in src/main/ipc/handlers/onboardingHandler.ts for channels: onboarding:get-status, onboarding:set-step, onboarding:detect-email-client, onboarding:validate-email-path, onboarding:test-llm-connection
- [X] T028 [US1] Implement LLM connection test with timeout (30 seconds) and response time tracking in src/main/llm/ConnectionTester.ts
- [X] T029 [US1] Implement step validation logic (email path required before step 2, LLM connection success before completion) in src/main/onboarding/OnboardingManager.ts
- [X] T030 [US1] Create onboarding wizard container in src/renderer/components/onboarding/OnboardingWizard.tsx with step navigation, progress indicator, resume from last completed step
- [X] T031 [US1] Add file system permission request handling with restricted mode fallback if denied in src/main/onboarding/PermissionManager.ts
- [X] T032 [US1] Handle first launch detection and redirect to onboarding wizard in src/main/index.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can complete setup and access main interface

---

## Phase 4: User Story 2 - View and Interact with Daily Report (Priority: P1)

**Goal**: Display daily email report with extracted action items, confidence indicators, expandable details, and empty state handling

**Independent Test**: Generate report with sample emails, verify items categorized correctly, confidence indicators displayed, details expand/collapse

### Tests for User Story 2

- [ ] T033 [P] [US2] Unit test for confidence level classification (getConfidenceLevel, getConfidenceDisplay) in tests/unit/shared/reports/confidence.test.ts
- [ ] T034 [P] [US2] Integration test for reports IPC channels (reports:get-today, reports:get-by-date, reports:expand-item, reports:copy-search-term) in tests/integration/ipc/reports.test.ts
- [ ] T035 [P] [US2] Component test for ItemCard expand/collapse animation in tests/unit/renderer/components/reports/ItemCard.test.tsx

### Implementation for User Story 2

- [ ] T036 [P] [US2] Create reportStore in src/renderer/stores/reportStore.ts with Zustand for today's report data, expanded items, AI explanation mode
- [ ] T037 [P] [US2] Create ConfidenceBadge component in src/renderer/components/reports/ConfidenceBadge.tsx with visual indicators (✓准确, !需复核, !!需复核) per confidence levels
- [ ] T038 [P] [US2] Create SummaryBanner component in src/renderer/components/reports/SummaryBanner.tsx with template "今天共处理 {total} 封邮件,其中 {review_count} 件需要你重点关注"
- [ ] T039 [P] [US2] Create ItemCard component in src/renderer/components/reports/ItemCard.tsx with confidence badge, title, priority, feedback buttons, expand/collapse icon, 300ms animation
- [ ] T040 [P] [US2] Create ItemDetails component in src/renderer/components/reports/ItemDetails.tsx with extraction rationale, email metadata list, "Copy Search Term" button
- [ ] T041 [P] [US2] Create EmptyState component in src/renderer/components/shared/EmptyState.tsx with scheduled time display, "Generate Now" button for no-report scenario
- [ ] T042 [P] [US2] Create celebratory empty state variant in src/renderer/components/reports/CelebratoryEmptyState.tsx for zero items scenario
- [ ] T043 [US2] Implement reports IPC handlers in src/main/ipc/handlers.ts for channels: reports:get-today, reports:get-by-date, reports:expand-item, reports:copy-search-term
- [ ] T044 [US2] Implement confidence display mode switching (default vs AI explanation) in src/renderer/components/reports/ReportView.tsx based on settings.display.aiExplanationMode
- [ ] T045 [US2] Create ReportView container in src/renderer/components/reports/ReportView.tsx with completed/pending sections, expand all/collapse all, keyboard navigation (Tab, Enter, Esc)
- [ ] T046 [US2] Implement search keyword generation (format: `from:{sender} {subject_keywords}`) in src/main/reports/SearchTermGenerator.ts
- [ ] T047 [US2] Add clipboard integration for "Copy Search Term" with 1-second confirmation toast in src/renderer/hooks/useClipboard.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can complete setup and view daily reports

---

## Phase 5: User Story 3 - Provide Feedback on AI Analysis (Priority: P1)

**Goal**: Allow users to mark items as accurate (OK) or incorrect (X) with error reason selection, storing feedback locally per constitution v1.3.0

**Independent Test**: Mark items as accurate/incorrect, verify feedback stored locally, confirmation messages appear, item cards show feedback status

### Tests for User Story 3

- [ ] T048 [P] [US3] Unit test for feedback submission and statistics calculation in tests/unit/main/reports/FeedbackManager.test.ts
- [ ] T049 [P] [US3] Integration test for reports:submit-feedback IPC channel in tests/integration/ipc/reports.test.ts
- [ ] T050 [P] [US3] Component test for FeedbackButtons and ErrorReasonDialog in tests/unit/renderer/components/reports/FeedbackButtons.test.tsx

### Implementation for User Story 3

- [ ] T051 [P] [US3] Create FeedbackButtons component in src/renderer/components/reports/FeedbackButtons.tsx with OK/X buttons, tooltips ("标记准确", "标记错误"), disabled state after feedback
- [ ] T052 [P] [US3] Create ErrorReasonDialog component in src/renderer/components/reports/ErrorReasonDialog.tsx with four error type options (content_error, priority_error, not_actionable, source_error), cancel button
- [ ] T053 [P] [US3] Extend reportStore with feedback status tracking in src/renderer/stores/reportStore.ts
- [ ] T054 [US3] Implement reports:submit-feedback IPC handler in src/main/ipc/handlers.ts with validation (itemId exists, feedback_type enum)
- [ ] T055 [US3] Implement feedback persistence in todo_items.feedback_type column in src/main/reports/FeedbackManager.ts with timestamp tracking
- [ ] T056 [US3] Implement feedback statistics query (total, accurate_count, error_count, this_month_corrections) in src/main/reports/FeedbackManager.ts
- [ ] T057 [US3] Add "已标记为准确" toast (2 seconds) on OK button in src/renderer/components/reports/FeedbackButtons.tsx
- [ ] T058 [US3] Add "已反馈" status indicator on item cards after feedback submission in src/renderer/components/reports/ItemCard.tsx
- [ ] T059 [US3] Integrate FeedbackButtons into ItemCard component in src/renderer/components/reports/ItemCard.tsx with hover state handling
- [ ] T060 [US3] Create useToast hook in src/renderer/hooks/useToast.ts for success/error feedback notifications (success 3s, error 5s, warning 4s, info 3s)

**Checkpoint**: All user stories 1-3 should now be independently functional - core feedback loop complete

---

## Phase 6: User Story 4 - Manually Generate Daily Report (Priority: P1)

**Goal**: Provide on-demand report generation with confirmation dialog, real-time progress updates, cancellation support, and completion summary

**Independent Test**: Click manual generate button, confirm dialog, wait for completion, verify new report appears with correct categorization

### Tests for User Story 4

- [ ] T061 [P] [US4] Unit test for progress event throttling (max 10 updates/second) in tests/unit/main/llm/ReportGenerator.test.ts
- [ ] T062 [P] [US4] Integration test for generation IPC channels (generation:start, generation:cancel, generation:progress events) in tests/integration/ipc/generation.test.ts
- [ ] T063 [P] [US4] Component test for ProgressDialog real-time updates in tests/unit/renderer/components/generation/ProgressDialog.test.tsx

### Implementation for User Story 4

- [ ] T064 [P] [US4] create generationStore in src/renderer/stores/generationStore.ts with Zustand for generation state, progress data, cancellation flag
- [ ] T065 [P] [US4] Create ManualGenerateButton component in src/renderer/components/generation/ManualGenerateButton.tsx with disabled state when no new emails, tooltip "暂无新邮件"
- [ ] T066 [P] [US4] Create ConfirmationDialog component in src/renderer/components/generation/ConfirmationDialog.tsx with unprocessed email count, "Start Generation" and cancel buttons
- [ ] T067 [P] [US4] Create ProgressDialog component in src/renderer/components/generation/ProgressDialog.tsx with progress bar (0-100%), current count/total, current subject, cancel button
- [ ] T068 [P] [US4] Create CompletionDialog component in src/renderer/components/generation/CompletionDialog.tsx with total emails, completed/pending counts, review count, failure summary, "View Report" button
- [ ] T069 [US4] Implement generation:start IPC handler with email count detection in src/main/llm/ReportGenerator.ts
- [ ] T070 [US4] Implement generation:cancel IPC handler with graceful shutdown (finish current batch, then stop) in src/main/llm/ReportGenerator.ts
- [ ] T071 [US4] Implement generation:progress event stream with throttling (max 10 updates/second) in src/main/llm/ReportGenerator.ts using webContents.send
- [ ] T072 [US4] Add progress listener in renderer ProgressDialog using ipcRenderer.on in src/renderer/components/generation/ProgressDialog.tsx
- [ ] T073 [US4] Implement error handling for corrupted/oversized emails with skip logging in src/main/llm/ReportGenerator.ts
- [ ] T074 [US4] Handle insufficient disk space check (<100MB) before generation in src/main/llm/ReportGenerator.ts
- [ ] T075 [US4] Implement large batch processing (>1000 emails) in chunks of 100 with progress indication in src/main/llm/ReportGenerator.ts
- [ ] T076 [US4] Add force-quit confirmation dialog ("报告生成中,确定要退出吗?") in src/main/index.ts

**Checkpoint**: User Stories 1-4 should all work - users can setup, view reports, provide feedback, and generate reports manually

---

## Phase 7: User Story 5 - Browse and Search Historical Reports (Priority: P1)

**Goal**: Provide History page with calendar view, blue-dot indicators, search functionality with 300ms debounce, date filters, and pagination

**Independent Test**: Generate multiple reports across dates, navigate calendar, select dates, use search, verify correct items appear with pagination

### Tests for User Story 5

- [ ] T077 [P] [US5] Unit test for FTS5 search query builder with filters in tests/unit/main/database/SearchManager.test.ts
- [ ] T078 [P] [US5] Unit test for pagination logic (20 items per page) in tests/unit/main/database/SearchManager.test.ts
- [ ] T079 [P] [US5] Integration test for reports:search IPC channel with filters in tests/integration/ipc/reports.test.ts
- [ ] T080 [P] [US5] Component test for CalendarView blue-dot indicators in tests/unit/renderer/components/history/CalendarView.test.tsx

### Implementation for User Story 5

- [ ] T081 [P] [US5] Create historyStore in src/renderer/stores/historyStore.ts with Zustand for selected date, search query, filters, pagination, search results
- [ ] T082 [P] [US5] Create CalendarView component in src/renderer/components/history/CalendarView.tsx extending shadcn/ui Calendar with custom DayContent for blue-dot indicators (6px diameter, blue-500)
- [ ] T083 [P] [US5] Create SearchBar component in src/renderer/components/history/SearchBar.tsx with 300ms debounce, match count display, keyword highlighting
- [ ] T084 [P] [US5] Create DateFilter component in src/renderer/components/history/DateFilter.tsx with presets (All, Today, Last 7 Days, Last 30 Days, This Month, Last Month, Custom Range)
- [ ] T085 [P] [US5] Create ReportList component in src/renderer/components/history/ReportList.tsx with virtual scrolling for large lists, pagination controls (20 items/page)
- [ ] T086 [P] [US5] Create HistoryView container in src/renderer/components/history/HistoryView.tsx with calendar sidebar, search bar, date filter, report list, empty state ("暂无历史报告")
- [ ] T087 [US5] Implement reports:search IPC handler with FTS5 query building in src/main/database/SearchManager.ts
- [ ] T088 [US5] Implement filter application (itemTypes, confidenceLevels, hasFeedback) in FTS5 WHERE clause in src/main/database/SearchManager.ts
- [ ] T089 [US5] Implement date range filtering with startDate/endDate calculation in src/main/database/SearchManager.ts
- [ ] T090 [US5] Add keyword highlighting in search results using matchHighlights map in src/renderer/components/history/ReportList.tsx
- [ ] T091 [US5] Implement pagination with OFFSET/LIMIT in FTS5 query in src/main/database/SearchManager.ts
- [ ] T092 [US5] Add calendar blue-dot data loading (report dates, item counts) in src/renderer/components/history/CalendarView.tsx

**Checkpoint**: User Stories 1-5 should all work - full historical access and search functionality complete

---

## Phase 8: User Story 6 - Configure Application Settings (Priority: P1)

**Goal**: Provide Settings page with 7 sections (Email, Schedule, LLM, Display, Notifications, Data, About) for configuration management

**Independent Test**: Navigate settings, modify each section, save changes, verify changes persist and take effect

### Tests for User Story 6

- [ ] T093 [P] [US6] Unit test for settings validation with Zod schemas in tests/unit/shared/settings/validation.test.ts
- [ ] T094 [P] [US6] Integration test for settings IPC channels (settings:get-all, settings:update, settings:cleanup-data, settings:destroy-feedback) in tests/integration/ipc/settings.test.ts
- [ ] T095 [P] [US6] Component test for SettingsView section navigation in tests/unit/renderer/components/settings/SettingsView.test.tsx

### Implementation for User Story 6

- [ ] T096 [P] [US6] Create settingsStore in src/renderer/stores/settingsStore.ts with Zustand for activeSection, all settings sections, validation state
- [ ] T097 [P] [US6] Create SettingsView container in src/renderer/components/settings/SettingsView.tsx with section navigation sidebar, 7 section panels
- [ ] T098 [P] [US6] Create EmailConfigSection component in src/renderer/components/settings/EmailConfigSection.tsx with current path display, "Modify Path" button, validation
- [ ] T099 [P] [US6] Create ScheduleSection component in src/renderer/components/settings/ScheduleSection.tsx with time picker (hour/minute), skip weekends toggle
- [ ] T100 [P] [US6] Create LLMConfigSection component in src/renderer/components/settings/LLMConfigSection.tsx with mode switch, endpoint inputs, API key field, "Test Connection" button, response time display
- [ ] T101 [P] [US6] Create DisplaySettingsSection component in src/renderer/components/settings/DisplaySettingsSection.tsx with "AI Explanation Mode" toggle
- [ ] T102 [P] [US6] Create NotificationSection component in src/renderer/components/settings/NotificationSection.tsx with enable/disable, do-not-disturb (22:00-08:00), sound toggle, "Test Notification" button
- [ ] T103 [P] [US6] Create DataManagementSection component in src/renderer/components/settings/DataManagementSection.tsx with data size display, feedback stats, "Clean Data Older Than 30 Days", "Clear All History" (type "确认删除"), "Destroy All Feedback Data"
- [ ] T104 [P] [US6] Create AboutSection component in src/renderer/components/settings/AboutSection.tsx with version display, "Check Updates" button, help documentation links
- [ ] T105 [US6] Implement settings:get-all IPC handler returning SettingsState in src/main/config/ConfigManager.ts
- [ ] T106 [US6] Implement settings:update IPC handler with section-based Zod validation in src/main/config/ConfigManager.ts
- [ ] T107 [US6] Implement settings:cleanup-data IPC handler with impact preview (cutoffDate, reportCount, itemCount, sizeToFree) in src/main/config/DataManager.ts
- [ ] T108 [US6] Implement settings:destroy-feedback IPC handler with confirmation phrase validation ("确认删除") in src/main/config/DataManager.ts
- [ ] T109 [US6] Add LLM mode switching with hot-swap (no restart required) in src/main/config/ConfigManager.ts
- [ ] T110 [US6] Implement scheduled task update when schedule settings change in src/main/scheduler/SchedulerManager.ts

**Checkpoint**: All P1 user stories (1-6) should now be complete - full MVP functionality achieved

---

## Phase 9: User Story 7 - Receive Desktop Notifications (Priority: P2)

**Goal**: Send desktop notifications for report generation, errors, system state changes with do-not-disturb mode, 3-minute aggregation, and click actions

**Independent Test**: Configure notification settings, trigger events (generation complete, errors), verify notifications appear with correct content and timing

### Tests for User Story 7

- [ ] T111 [P] [US7] Unit test for do-not-disturb time calculation (including overnight schedules) in tests/unit/main/notifications/NotificationManager.test.ts
- [ ] T112 [P] [US7] Unit test for notification aggregation (3-minute window) in tests/unit/main/notifications/NotificationManager.test.ts
- [ ] T113 [P] [US7] Integration test for notification IPC channels (notifications:send-test, notifications:configure) in tests/integration/ipc/notifications.test.ts

### Implementation for User Story 7

- [ ] T114 [P] [US7] Create notificationStore in src/renderer/stores/notificationStore.ts with Zustand for notification settings, test notification trigger
- [ ] T115 [P] [US7] Implement notifications:send-test IPC handler in src/main/notifications/NotificationManager.ts
- [ ] T116 [P] [US7] Implement notifications:configure IPC handler in src/main/notifications/NotificationManager.ts
- [ ] T117 [US7] Implement notification priority levels (normal: 5s timeout, low: 3s timeout, urgent: persistent) in src/main/notifications/NotificationManager.ts
- [ ] T118 [US7] Implement do-not-disturb logic with overnight schedule support in src/main/notifications/NotificationManager.ts
- [ ] T119 [US7] Implement notification aggregation (3-minute window, merge identical types) in src/main/notifications/NotificationManager.ts with in-memory queue
- [ ] T120 [US7] Add notification click handlers ("View Report" brings app to front) in src/main/notifications/NotificationManager.ts
- [ ] T121 [US7] Implement individual item notification limit (max 2 occurrences) in src/main/notifications/NotificationManager.ts
- [ ] T122 [US7] Send report generation completion notifications with summary in src/main/llm/ReportGenerator.ts
- [ ] T123 [US7] Send error notifications for LLM connection failures in src/main/llm/ConnectionTester.ts
- [ ] T124 [US7] Integrate notification permission request in onboarding step 1 in src/renderer/components/onboarding/WelcomeScreen.tsx

**Checkpoint**: P1 stories + US7 (notifications) should all work - enhanced user experience complete

---

## Phase 10: User Story 8 - Edit Action Item Details (Priority: P2)

**Goal**: Enable inline editing of item fields (title, due date, description, priority) with auto-save (1 second debounce), validation, and visual feedback

**Independent Test**: Double-click editable fields, modify values, verify validation and auto-save with visual feedback

### Tests for User Story 8

- [ ] T125 [P] [US8] Unit test for inline edit validation rules (title max 200, description max 500, priority enum, date format) in tests/unit/renderer/hooks/useInlineEdit.test.ts
- [ ] T126 [P] [US8] Unit test for debounced auto-save (1 second) in tests/unit/renderer/hooks/useInlineEdit.test.ts
- [ ] T127 [P] [US8] Component test for ItemInlineEdit visual feedback (editing state, saving, success, error animations) in tests/unit/renderer/components/reports/ItemInlineEdit.test.tsx

### Implementation for User Story 8

- [ ] T128 [P] [US8] Create useInlineEdit hook in src/renderer/hooks/useInlineEdit.ts with optimistic UI, debounced auto-save (1 second), validation, visual feedback
- [ ] T129 [P] [US8] Create ItemInlineEdit component in src/renderer/components/reports/ItemInlineEdit.tsx with field-specific editors (text input, date picker, textarea, dropdown)
- [ ] T130 [US8] Implement reports:inline-edit IPC handler in src/main/ipc/handlers.ts with field validation
- [ ] T131 [US8] Add inline edit state to ReportDisplayItem in-memory (not persisted) in src/renderer/stores/reportStore.ts
- [ ] T132 [US8] Implement double-click handlers for editable fields in src/renderer/components/reports/ItemCard.tsx
- [ ] T133 [US8] Add visual feedback styles (editing: light blue #EFF6FF, blue border #4F46E5, success: green checkmark, error: shake animation) in src/renderer/components/reports/ItemInlineEdit.tsx
- [ ] T134 [US8] Implement field validation (title: non-empty max 200, description: max 500, dueDate: valid date, priority: enum) in src/main/reports/InlineEditManager.ts
- [ ] T135 [US8] Add small dot indicator on modified item cards in src/renderer/components/reports/ItemCard.tsx
- [ ] T136 [US8] Handle cancel on Escape key, save on blur in src/renderer/hooks/useInlineEdit.ts

**Checkpoint**: P1 stories + US7-US8 should all work - advanced features complete

---

## Phase 11: User Story 9 - Application Updates Management (Priority: P2)

**Goal**: Inform users about application updates with automatic checking, classification (major/minor/patch/security), background download, and restart prompts

**Independent Test**: Configure auto-update settings, trigger update checks, simulate available updates, verify dialogs appear correctly

### Tests for User Story 9

- [ ] T137 [P] [US9] Unit test for update version classification logic (major, minor, patch, security) in tests/unit/main/update/UpdateManager.test.ts
- [ ] T138 [P] [US9] Integration test for auto-update with GitHub releases in tests/integration/main/update/UpdateManager.test.ts
- [ ] T139 [P] [US9] Component test for update notification dialog in tests/unit/renderer/components/UpdateNotification.test.tsx

### Implementation for User Story 9

- [ ] T140 [P] [US9] Extend settingsStore with update settings (autoCheck, downloadSecurityWithoutPrompt, promptBeforeFeatureUpdates) in src/renderer/stores/settingsStore.ts
- [ ] T141 [P] [US9] Create UpdateNotification component in src/renderer/components/UpdateNotification.tsx with version info, release notes, download progress, "Update Now", "Remind Me Later" buttons
- [ ] T142 [P] [US9] Implement update checking on app launch (silent, non-blocking) in src/main/update/UpdateManager.ts
- [ ] T143 [US9] Implement periodic update checking (every 7 days) in src/main/update/UpdateManager.ts
- [ ] T144 [US9] Implement update version classification (major, minor, patch, security) in src/main/update/UpdateManager.ts
- [ ] T145 [US9] Implement background download for patch versions in src/main/update/UpdateManager.ts
- [ ] T146 [US9] Implement restart prompt with current version, new version, warning in src/main/update/UpdateManager.ts
- [ ] T147 [US9] Integrate update notification in AboutSection in src/renderer/components/settings/AboutSection.tsx
- [ ] T148 [US9] Add auto-update configuration options to settings in src/renderer/components/settings/AboutSection.tsx

**Checkpoint**: All P1 and P2 user stories (1-9) should now be complete - full feature set implemented

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T149 [P] Add ARIA labels to all interactive elements (item cards, feedback buttons, confidence badges, progress bars) in src/renderer/components/ per FR-094
- [ ] T150 [P] Implement keyboard navigation support (Tab for focus, Enter for confirmation, Esc for dialogs) across all components per FR-093
- [ ] T151 [P] Verify WCAG AA color contrast compliance for all text elements using automated checker per FR-092
- [ ] T152 [P] Add loading states and skeletons for all async operations in src/renderer/components/shared/
- [ ] T153 [P] Optimize animation timings (150ms fast, 300ms standard, 500ms slow) across all transitions per FR-095
- [ ] T154 [P] Add structured logging to all main process modules excluding sensitive data in src/main/
- [ ] T155 [P] Implement error boundary for React components with graceful fallback UI in src/renderer/App.tsx
- [ ] T156 [P] Add security tests for field encryption validation in tests/security/encryption.test.ts
- [ ] T157 [P] Add security tests for IPC whitelist enforcement in tests/security/ipc-whitelist.test.ts
- [ ] T158 [P] Add integration test for database operations (FTS5 search, feedback persistence) in tests/integration/database/operations.test.ts
- [ ] T159 [P] Add integration test for UI flow (complete onboarding → generate report → submit feedback) in tests/integration/ui/full-user-journey.test.ts
- [ ] T160 Performance optimization: verify 100-email report generation <2 minutes per SC-002
- [ ] T161 Performance optimization: verify search <1 second for 10k items per SC-011
- [ ] T162 Performance optimization: verify application startup <3 seconds per SC-013
- [ ] T163 Code cleanup: remove unused imports, consolidate duplicate code, add missing error handling
- [ ] T164 Update CLAUDE.md with completed user interaction system features
- [ ] T165 Run full test suite and verify ≥80% line coverage, ≥70% branch coverage per constitution
- [ ] T166 Run quickstart.md validation to ensure developer onboarding instructions are accurate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Setup**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1) - View Reports**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P1) - Feedback**: Can start after Foundational - Integrates with US2 but independently testable
- **User Story 4 (P1) - Manual Generation**: Can start after Foundational - Integrates with US2 but independently testable
- **User Story 5 (P1) - History/Search**: Can start after Foundational - No dependencies on other stories
- **User Story 6 (P1) - Settings**: Can start after Foundational - Configures all other stories but independently testable
- **User Story 7 (P2) - Notifications**: Can start after Foundational - No dependencies on other stories
- **User Story 8 (P2) - Inline Editing**: Can start after Foundational - Integrates with US2 but independently testable
- **User Story 9 (P2) - Updates**: Can start after Foundational - No dependencies on other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Red-Green-Refactor per constitution)
- Models/stores before services/components
- Services/components before integration
- Core implementation before UI polish
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase (T001-T007)**:
- All [P] tasks can run in parallel

**Foundational Phase (T008-T017)**:
- T009, T010 can run in parallel
- T012, T013 can run in parallel

**User Story 1 (T018-T032)**:
- T018-T021 (all tests) can run in parallel
- T022-T026 (all stores/components) can run in parallel

**User Story 2 (T033-T047)**:
- T033-T035 (all tests) can run in parallel
- T036-T042 (all stores/components) can run in parallel

**User Story 3 (T048-T060)**:
- T048-T050 (all tests) can run in parallel
- T051-T053 (stores/components) can run in parallel

**User Story 4 (T061-T076)**:
- T061-T063 (all tests) can run in parallel
- T064-T068 (all stores/components) can run in parallel

**User Story 5 (T077-T092)**:
- T077-T080 (all tests) can run in parallel
- T081-T086 (all stores/components) can run in parallel

**User Story 6 (T093-T110)**:
- T093-T095 (all tests) can run in parallel
- T096-T104 (all stores/components) can run in parallel

**User Story 7 (T111-T124)**:
- T111-T113 (all tests) can run in parallel
- T114-T116 (stores/components) can run in parallel

**User Story 8 (T125-T136)**:
- T125-T127 (all tests) can run in parallel
- T128-T129 (hooks/components) can run in parallel

**User Story 9 (T137-T148)**:
- T137-T139 (all tests) can run in parallel
- T140-T141 (stores/components) can run in parallel

**Polish Phase (T149-T166)**:
- All [P] tasks can run in parallel

**Cross-Story Parallel Execution**:
- Once Foundational phase completes, all user stories can be developed in parallel by different team members

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for confidence level classification in tests/unit/shared/reports/confidence.test.ts"
Task: "Integration test for reports IPC channels in tests/integration/ipc/reports.test.ts"
Task: "Component test for ItemCard expand/collapse in tests/unit/renderer/components/reports/ItemCard.test.tsx"

# Launch all stores/components for User Story 2 together:
Task: "Create reportStore in src/renderer/stores/reportStore.ts"
Task: "Create ConfidenceBadge component in src/renderer/components/reports/ConfidenceBadge.tsx"
Task: "Create SummaryBanner component in src/renderer/components/reports/SummaryBanner.tsx"
Task: "Create ItemCard component in src/renderer/components/reports/ItemCard.tsx"
Task: "Create ItemDetails component in src/renderer/components/reports/ItemDetails.tsx"
Task: "Create EmptyState component in src/renderer/components/shared/EmptyState.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-6 Only - All P1)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T017) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 - Setup (T018-T032)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Complete Phase 4: User Story 2 - View Reports (T033-T047)
6. **STOP and VALIDATE**: Test User Story 2 independently
7. Complete Phase 5: User Story 3 - Feedback (T048-T060)
8. **STOP and VALIDATE**: Test User Story 3 independently
9. Complete Phase 6: User Story 4 - Manual Generation (T061-T076)
10. **STOP and VALIDATE**: Test User Story 4 independently
11. Complete Phase 7: User Story 5 - History/Search (T077-T092)
12. **STOP and VALIDATE**: Test User Story 5 independently
13. Complete Phase 8: User Story 6 - Settings (T093-T110)
14. **STOP and VALIDATE**: Test User Story 6 independently
15. Deploy/demo P1 MVP

### Incremental Delivery (All Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP foundation!)
3. Add User Story 2 → Test independently → Deploy/Demo (core value!)
4. Add User Story 3 → Test independently → Deploy/Demo (feedback loop!)
5. Add User Story 4 → Test independently → Deploy/Demo (manual control!)
6. Add User Story 5 → Test independently → Deploy/Demo (historical access!)
7. Add User Story 6 → Test independently → Deploy/Demo (configuration!)
8. Add User Story 7 → Test independently → Deploy/Demo (enhanced UX!)
9. Add User Story 8 → Test independently → Deploy/Demo (power user!)
10. Add User Story 9 → Test independently → Deploy/Demo (maintainability!)
11. Complete Polish phase → Final production release
12. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T017)
2. Once Foundational is done:
   - Developer A: User Story 1 (T018-T032)
   - Developer B: User Story 2 (T033-T047)
   - Developer C: User Story 3 (T048-T060)
3. Sprint 2:
   - Developer A: User Story 4 (T061-T076)
   - Developer B: User Story 5 (T077-T092)
   - Developer C: User Story 6 (T093-T110)
4. Sprint 3:
   - Developer A: User Story 7 (T111-T124) + Polish tasks
   - Developer B: User Story 8 (T125-T136) + Polish tasks
   - Developer C: User Story 9 (T137-T148) + Polish tasks
5. Stories complete and integrate independently

---

## Task Count Summary

- **Total Tasks**: 166
- **Setup Phase**: 7 tasks
- **Foundational Phase**: 10 tasks (BLOCKS all user stories)
- **User Story 1 (P1)**: 15 tasks (4 tests, 11 implementation)
- **User Story 2 (P1)**: 15 tasks (3 tests, 12 implementation)
- **User Story 3 (P1)**: 13 tasks (3 tests, 10 implementation)
- **User Story 4 (P1)**: 16 tasks (3 tests, 13 implementation)
- **User Story 5 (P1)**: 16 tasks (4 tests, 12 implementation)
- **User Story 6 (P1)**: 18 tasks (3 tests, 15 implementation)
- **User Story 7 (P2)**: 14 tasks (3 tests, 11 implementation)
- **User Story 8 (P2)**: 12 tasks (3 tests, 9 implementation)
- **User Story 9 (P2)**: 12 tasks (3 tests, 9 implementation)
- **Polish Phase**: 18 tasks

**Parallel Opportunities Identified**: 95 tasks (57% of total) can run in parallel within their phases

**Suggested MVP Scope**: User Stories 1-6 (P1 only) = 107 tasks (excluding Foundational which is required)

**Independent Test Criteria**: Each user story has explicit independent test criteria defined in its phase header

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Red-Green-Refactor per constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tasks follow strict checklist format (checkbox, ID, labels, file paths)
- Format validation: ALL tasks comply with `- [ ] [TaskID] [P?] [Story?] Description with file path` format
