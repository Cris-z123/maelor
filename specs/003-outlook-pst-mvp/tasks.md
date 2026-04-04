# Tasks: Outlook PST Direct-Connect MVP

**Input**: Design documents from `/specs/003-outlook-pst-mvp/`  
**Prerequisites**: `spec.md`, `plan.md`, `data-model.md`, `contracts/ipc.md`

**Tests**: Included because the feature requires restoring compile gates and validating the narrowed MVP path.

**Organization**: Tasks are grouped by user story and must be the only active implementation source for this MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: `US1`, `US2`, `US3`
- Every code change must map to a task below.

## Phase 0: Specification Convergence

- [x] T001 Create `specs/003-outlook-pst-mvp/` using Spec-Kit templates and finalize active MVP scope
- [x] T002 Update `.specify/memory/constitution.md` with the MVP scope-lock rule
- [x] T003 Mark `specs/001-email-item-traceability/` and `specs/002-user-interaction-system/` as historical reference only
- [x] T004 Produce a deletion/exclusion inventory for non-MVP modules and tests

---

## Phase 1: Stop the Bleeding (Foundational)

- [x] T005 Remove duplicate renderer report-view surface and keep one active run-review entry path
- [x] T006 Narrow renderer compile scope to MVP pages/components only
- [x] T007 Narrow shared compile surface to MVP contracts/types only
- [x] T008 Remove non-MVP IPC channels from the active client/server surface
- [x] T008b Remove `mvp`-prefixed active runtime/module/type/config naming and replace it with final domain naming; delete compatibility naming layers instead of keeping parallel product namespaces
- [x] T008c Purge non-MVP shared runtime contracts, preload/compile-manifest references, and main-process modules so active repository roots no longer carry dormant feedback, notifications, mode switching, auto-update, or legacy cleanup surfaces
- [x] T008d Purge non-MVP renderer components and obsolete tests so `src/renderer/` and `tests/` only retain the narrowed onboarding/latest-run/history/settings product
- [x] T008a Narrow `electron/preload.js` and renderer-side MVP API wrappers to the active onboarding/runs/settings contract only
- [x] T009 Remove non-MVP stores and inactive UI modules from the repository, not only from the active compile surface
- [x] T010 Restore `pnpm run typecheck`
- [x] T011 Restore `pnpm run lint`

**Checkpoint**: The repository compiles and lints again with only the MVP-active surface, and active source/test roots no longer carry dormant non-MVP product modules.

---

## Phase 2: User Story 1 - Complete First-Time Outlook Setup (Priority: P1) 🎯 MVP

**Goal**: Deliver a working 3-step onboarding flow for Outlook directory, PST validation, and AI configuration.

**Independent Test**: A fresh user can complete onboarding with a readable PST and a valid AI connection.

### Tests for User Story 1

- [x] T012 [P] [US1] Add unit tests for Outlook directory detection and validation in `tests/unit/main/onboarding/`
- [x] T013 [P] [US1] Add integration tests for onboarding IPC contracts in `tests/integration/ipc/`
- [x] T014 [P] [US1] Add renderer tests for the 3-step onboarding flow in `tests/unit/renderer/components/onboarding/`

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement Outlook directory detection in `src/main/onboarding/`
- [x] T016 [P] [US1] Implement PST discovery/readability classification in `src/main/outlook/`
- [x] T017 [US1] Implement onboarding IPC handlers from `contracts/ipc.md`
- [x] T017a [US1] Ensure Outlook auto-detection is advisory only and does not persist active configuration before validation or onboarding completion
- [x] T018 [US1] Implement onboarding stores and components for directory, validation list, and AI connection card
- [x] T019 [US1] Route the app to onboarding until configuration completes

**Checkpoint**: Onboarding is complete and independently testable.

---

## Phase 3: User Story 2 - Run Outlook Scan and Review Latest Results (Priority: P1)

**Goal**: Deliver the run pipeline and the latest-run review shell.

**Independent Test**: A configured user can start a run and review the latest extracted items with evidence.

### Tests for User Story 2

- [x] T020 [P] [US2] Add unit tests for run persistence and evidence binding in `tests/unit/main/`
- [x] T021 [P] [US2] Add integration tests for `runs.start`, `runs.getLatest`, and `runs.getById`
- [x] T022 [P] [US2] Add renderer tests for the latest-run list/detail review layout

### Implementation for User Story 2

- [x] T023 [P] [US2] Implement run repositories and data access in `src/main/runs/`
- [x] T023a [US2] Persist latest-run review data in SQLite MVP run tables instead of config-backed JSON snapshots
- [x] T024 [US2] Implement `runs.start` using PST discovery + parsing + item extraction + evidence persistence
- [x] T025 [US2] Implement `runs.getLatest` and `runs.getById`
- [x] T026 [US2] Implement the app shell and latest-run route in `src/renderer/app/`
- [x] T027 [US2] Implement run summary card, item list, item card, detail panel, and evidence list in `src/renderer/components/runs/`
- [x] T028 [US2] Implement copy-search-term behavior and low-confidence visual treatment

**Checkpoint**: The core run/review loop is complete and independently testable.

---

## Phase 4: User Story 3 - Review Recent Runs and Maintain Core Settings (Priority: P2)

**Goal**: Deliver recent-run history and the narrowed settings surface.

**Independent Test**: A user can inspect the latest 20 runs and update Outlook, AI, and data settings.

### Tests for User Story 3

- [ ] T029 [P] [US3] Add integration tests for `runs.listRecent` and settings IPC
- [ ] T030 [P] [US3] Add renderer tests for history table and settings sections

### Implementation for User Story 3

- [x] T031 [P] [US3] Implement `runs.listRecent`
- [x] T032 [US3] Implement recent-runs table and historical-run navigation
- [x] T033 [US3] Implement settings sections for Outlook directory, AI configuration, and data management
- [x] T034 [US3] Implement settings data summary, clear-runs, and rebuild-index actions

**Checkpoint**: The MVP is complete for repeat usage.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T035 [P] Remove or quarantine legacy tests for feedback, notifications, mode switching, multi-client onboarding, calendar history, and inline editing
- [ ] T036 [P] Update generated agent/developer context files to point to the active `003` MVP
- [ ] T037 Run final validation: `pnpm run typecheck`, `pnpm run lint`, relevant MVP unit/integration tests, and a repository purge audit over active roots
- [x] T038 [P] Upgrade Vite 5→7 and @vitejs/plugin-react 4→5; verify typecheck, lint, test:unit, and build:renderer

## Implementation Strategy

1. Finish Phase 0 and Phase 1 before writing any new feature code.
2. Deliver User Story 1 as the first shippable slice.
3. Deliver User Story 2 as the core product slice.
4. Deliver User Story 3 only after the run/review loop is stable.
