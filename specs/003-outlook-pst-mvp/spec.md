# Feature Specification: Outlook PST Direct-Connect MVP

**Feature Branch**: `003-outlook-pst-mvp`  
**Created**: 2026-03-31  
**Status**: Active  
**Input**: User description: "Reset the product around a Spec-Kit-driven Outlook PST direct-connect MVP with a narrowed Windows/classic Outlook/PST-only boundary."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete First-Time Outlook Setup (Priority: P1)

As a first-time user, I want to configure an Outlook data directory, validate discovered PST files, and verify AI connectivity so that the app becomes usable in a single onboarding flow.

**Why this priority**: Without a working setup flow the product is unusable. This is the gateway to every other capability.

**Independent Test**: On a fresh install, a user can select an Outlook directory, see at least one readable PST, complete the AI connection test, and land on the main application shell.

**Acceptance Scenarios**:

1. **Given** the app is not configured, **When** it launches, **Then** it opens the onboarding flow instead of the main shell.
2. **Given** the onboarding flow is on step 1, **When** the user chooses an Outlook directory, **Then** the app validates that the directory exists and is readable.
3. **Given** a directory is selected, **When** the user proceeds to step 2, **Then** the app scans for PST files and shows readable vs unreadable files.
4. **Given** no readable PST exists, **When** the user tries to continue, **Then** onboarding is blocked with a clear validation error.
5. **Given** at least one readable PST exists, **When** the user reaches step 3 and tests the AI configuration, **Then** onboarding completes only after the connection test succeeds.

---

### User Story 2 - Run Outlook Scan and Review Latest Results (Priority: P1)

As a configured user, I want to scan my Outlook PST files and review extracted items with source evidence so that I can audit what the system found without reading the raw mailbox.

**Why this priority**: This is the product's core value. If scanning and review do not work, there is no MVP.

**Independent Test**: A configured user can start a scan, wait for completion, and review the latest run in a two-column screen with item cards and evidence details.

**Acceptance Scenarios**:

1. **Given** the app is configured, **When** the user opens the main shell, **Then** the default page is `最新结果`.
2. **Given** no run exists yet, **When** the latest results page loads, **Then** the app shows an empty state with an `立即扫描` action.
3. **Given** a run is started, **When** processing finishes, **Then** the app stores the run summary, extracted items, and item evidence in the MVP run tables.
4. **Given** a completed run exists, **When** the latest results page opens, **Then** the left pane shows item cards and the right pane shows details for the selected item.
5. **Given** an item has low confidence, **When** it appears in the list, **Then** its card uses a low-confidence visual treatment and its evidence region is expanded by default in the details pane.
6. **Given** an item is selected, **When** the user clicks `复制搜索词`, **Then** the search term is copied and a success message is shown.

---

### User Story 3 - Review Recent Runs and Maintain Core Settings (Priority: P2)

As a repeat user, I want to review recent scan runs and maintain the Outlook directory, AI configuration, and local data storage so that the tool remains operable over time.

**Why this priority**: The product remains usable without this story for a single session, but repeat usage requires it.

**Independent Test**: A configured user can open the history/settings area, inspect the last 20 runs, reopen a prior run, and update the core settings sections.

**Acceptance Scenarios**:

1. **Given** completed runs exist, **When** the user opens `历史运行`, **Then** the app shows a table with the most recent 20 runs.
2. **Given** a historical run row is clicked, **When** navigation occurs, **Then** the app reuses the latest-run review layout to display that run.
3. **Given** the user opens `设置`, **When** the page loads, **Then** only Outlook directory, AI configuration, and data management sections are present.
4. **Given** the user updates the Outlook directory or AI settings, **When** saving succeeds, **Then** the new settings persist and become active without exposing unsupported features.
5. **Given** the user triggers a data management action, **When** the action completes, **Then** the UI shows the updated database size or index state.

### Edge Cases

- What happens when the selected Outlook directory exists but contains zero PST files?
- What happens when a PST file is present but unreadable or corrupted?
- What happens when the AI provider is reachable but returns invalid structured output?
- What happens when a run is started while another run is already in progress?
- What happens when the latest run has zero extracted items but did process PST files successfully?
- What happens when auto-detection suggests a directory but the user overrides it before validation?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST treat `specs/003-outlook-pst-mvp/` as the only active implementation spec.
- **FR-002**: The system MUST restrict the MVP to Windows + classic Outlook + PST-only directory scanning.
- **FR-003**: The system MUST guide users through a 3-step onboarding flow: Outlook directory, PST validation, AI configuration.
- **FR-004**: The system MUST allow automatic Outlook directory detection, but detection failure MUST NOT block manual configuration.
- **FR-004a**: Automatic Outlook directory detection MUST be side-effect-free and MUST NOT persist configuration until validation or explicit completion.
- **FR-005**: The system MUST validate that the selected Outlook directory exists and is readable.
- **FR-006**: The system MUST discover PST files under the configured Outlook directory and classify them as readable or unreadable.
- **FR-007**: The system MUST block onboarding completion when no readable PST file is available.
- **FR-008**: The system MUST block onboarding completion when AI connection testing fails.
- **FR-009**: The system MUST allow the user to manually start a scan from the latest-results page.
- **FR-010**: The system MUST persist scan runs, discovered PST files, processed emails, extracted items, and item evidence.
- **FR-010a**: The system MUST persist active run-review data in SQLite run tables; temporary config-based bulk JSON persistence is not an allowed steady-state design.
- **FR-011**: The system MUST display the latest run as a two-column review layout with an item list and detail panel.
- **FR-012**: The system MUST show each item with title, item type, confidence level, source status, sender, sent time, and subject snippet.
- **FR-013**: The system MUST show detail-panel fields for item content, rationale, evidence, search term, file path, and source identifier/fingerprint.
- **FR-014**: The system MUST highlight low-confidence items with a warning visual treatment.
- **FR-015**: The system MUST provide a `复制搜索词` action for the selected item.
- **FR-016**: The system MUST provide a recent-runs view limited to the most recent 20 runs.
- **FR-017**: The system MUST provide only three settings groups: Outlook directory, AI configuration, and data management.
- **FR-018**: The system MUST NOT expose feedback, notifications, auto-update management, inline editing, search history, or calendar history in the MVP UI.
- **FR-019**: The preload and renderer-facing IPC surface MUST be narrowed to the MVP onboarding, runs, and settings contracts.

### Key Entities *(include if feature involves data)*

- **OutlookSourceConfig**: The configured Outlook directory and the last validation state.
- **ExtractionRun**: A single scan execution with timestamps, status, PST counts, processed email counts, and extracted item counts.
- **DiscoveredPstFile**: A PST file found during validation or scan, with path, readability state, size, and modification timestamp.
- **ProcessedEmail**: A normalized email record extracted from a PST during a run.
- **ActionItem**: An extracted todo/completed item with confidence and source status.
- **ItemEvidence**: Evidence attached to an action item, including sender, subject, time, search term, file path, and identifier/fingerprint.
- **SettingsView**: The persisted UI-visible settings for Outlook directory, AI configuration, and data management.

## Concrete UI Design

### App Shell

- Left narrow sidebar with fixed entries:
  - `最新结果`
  - `历史运行`
  - `设置`
- No dashboard page and no extra aggregate workspace.
- Default route:
  - unconfigured: `Onboarding`
  - configured: `最新结果`

### Onboarding

- Three card-based steps:
  1. Outlook directory
  2. PST validation
  3. AI configuration
- Step 1 components:
  - `DirectoryPickerField`
  - `尝试自动检测` secondary action
  - detected directory candidate fills the field only; it does not persist settings by itself
- Step 2 components:
  - `PstValidationList`
  - readable/unreadable states
- Step 3 components:
  - `ConnectionTestCard`
  - Base URL, API key, model fields
- Validation rules:
  - auto-detection failure does not block
  - auto-detection success is advisory until validation or onboarding completion
  - no readable PST blocks completion
  - failed AI connection blocks completion

### 最新结果

- Top toolbar:
  - `立即扫描`
  - `刷新`
- Main layout:
  - left pane: item list
  - right pane: item detail panel
- Item card fields:
  - title
  - `待办/已完成`
  - `高/中/低`
  - `已验证/待确认`
  - sender, sent time, subject snippet
- Detail panel fields:
  - full item text
  - rationale
  - evidence list
  - search term
  - file path
  - identifier or fingerprint
- Low-confidence items:
  - light yellow background
  - evidence expanded by default

### 历史运行

- Table layout only, no calendar.
- Maximum 20 rows.
- Columns:
  - time
  - PST count
  - email count
  - item count
  - status
- Clicking a row opens that run in the same review layout used by `最新结果`.

### 设置

- Only three sections:
  - Outlook directory
  - AI configuration
  - Data management
- Data management includes:
  - database path
  - database size
  - clear run history
  - rebuild index

### Visual Constraints

- Fonts:
  - headings: Inter
  - body: Inter
  - technical fields: JetBrains Mono
- Remove decorative visual treatments:
  - glassmorphism
  - noise textures
  - heavy gradients
  - heavy shadows
- Keep the semantic palette minimal:
  - blue / green / yellow / red / gray
- Target feel:
  - desktop utility
  - stable
  - medium information density
  - review-oriented, not promotional

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A fresh user can complete onboarding in under 3 minutes when a readable PST and valid AI configuration are available.
- **SC-002**: The app can discover at least one PST from a valid Outlook directory and present validation results without crashing.
- **SC-003**: Every displayed item in the latest run includes at least one evidence record in the detail panel.
- **SC-004**: The app shows the latest run and the last 20 historical runs through the narrowed MVP shell without exposing out-of-scope surfaces.
