# Implementation Plan: Outlook PST Direct-Connect MVP

**Branch**: `003-outlook-pst-mvp` | **Date**: 2026-03-31 | **Spec**: `/specs/003-outlook-pst-mvp/spec.md`
**Input**: Feature specification from `/specs/003-outlook-pst-mvp/spec.md`

## Summary

Reset mailCopilot around a single Windows/classic-Outlook/PST-only MVP. Replace the multi-feature drift with a Spec-Kit-driven implementation path, freeze `001` and `002`, and cut the codebase down to one compileable product surface: onboarding, latest-run review, and history/settings. The active implementation path also locks three technical constraints: Outlook auto-detection must be advisory until validation/completion, active run-review data must live in SQLite run tables, and preload/renderer contracts must expose only MVP onboarding, runs, and settings APIs.

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20.x  
**Primary Dependencies**: Electron 29.4.6, React 18, Zustand 4.5, Zod 3.22, Tailwind CSS 3.4, shadcn/ui, better-sqlite3 11.10, openai 4.x, pst-extractor  
**Storage**: SQLite via better-sqlite3, local filesystem for Outlook PST discovery  
**Testing**: Vitest (unit/integration/security), ESLint, TypeScript compiler  
**Target Platform**: Windows desktop, classic Outlook data directories  
**Project Type**: Electron desktop application  
**Performance Goals**: latest-run shell loads without renderer crashes; PST discovery completes with bounded UI feedback; recent runs limited to 20 rows  
**Constraints**: single active spec, PST-only, no unsupported client surfaces in code or UI, typecheck/lint required before expansion  
**Scale/Scope**: one Outlook directory, one AI provider configuration, recent 20 runs, latest selected run review

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Privacy-First Architecture**: Pass. Outlook directory scanning and local storage remain device-bound; no cloud backup introduced.
- **Anti-Hallucination Mechanism**: Pass. Action items remain coupled to item evidence records and low-confidence status is retained.
- **Data Minimization & Retention**: Pass. MVP continues to store runs, items, and evidence, not a full mailbox mirror.
- **Mode Switching & Network Isolation**: Pass by reduction. Multi-mode product surfaces are removed from MVP.
- **Testing & Quality Standards**: Must restore `typecheck` and `lint`, then re-establish focused unit/integration tests.
- **Single Instance & Concurrency Control**: Retained in main process.
- **Observability & Performance**: Logging retained; compile surface reduced.
- **MVP Scope Lock**: Pass only if code and docs remove non-MVP surfaces from active flow.

## Project Structure

### Documentation (this feature)

```text
specs/003-outlook-pst-mvp/
├── plan.md
├── spec.md
├── data-model.md
├── contracts/
│   └── ipc.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── main/
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── email/
│   ├── ipc/
│   ├── llm/
│   ├── onboarding/
│   ├── outlook/
│   ├── runs/
│   └── settings/
├── renderer/
│   ├── app/
│   ├── components/
│   │   ├── onboarding/
│   │   ├── runs/
│   │   ├── settings/
│   │   ├── shared/
│   │   └── ui/
│   ├── services/
│   ├── stores/
│   └── styles/
└── shared/
    ├── schemas/
    └── types/

tests/
├── integration/
├── unit/
└── security/
```

**Structure Decision**: Preserve the Electron split (`main` / `renderer` / `shared`) but narrow active implementation to Outlook onboarding, run management, and settings. Legacy modules stay only until removed or excluded from compilation.

## Implementation Strategy

### Phase 0: Specification Convergence

- Create the `003-outlook-pst-mvp` feature set under Spec-Kit.
- Add the MVP scope-lock rule to the constitution.
- Mark `001` and `002` as historical.
- Document the exact modules and test suites to remove or exclude.

### Phase 1: Stop the Bleeding

- Remove duplicate `ReportView` surfaces from the active renderer path.
- Remove non-MVP renderer components from the active compile surface.
- Narrow IPC, store, and UI entry points to onboarding, runs, and settings.
- Narrow preload and renderer-facing APIs to the MVP onboarding/runs/settings contract only.
- Restore:
  - `pnpm run typecheck`
  - `pnpm run lint`

### Phase 2: Outlook Directory Chain

- Implement side-effect-free Outlook directory detection and validation.
- Implement PST discovery and readability classification.
- Implement onboarding state machine with 3 steps.
- Persist Outlook directory and AI configuration only after validation or explicit onboarding completion.

### Phase 3: Run Chain

- Implement `runs.start`.
- Scan discovered PST files and parse emails.
- Persist runs, processed emails, items, and item evidence in SQLite MVP run tables.
- Implement `runs.getLatest` and `runs.getById`.

### Phase 4: Review UI

- Build the app shell with sidebar navigation.
- Build latest-run review with list/detail layout.
- Build item cards, detail panel, evidence list, and copy-search-term.
- Apply low-confidence visual treatment.

### Phase 5: History & Settings

- Build recent-runs table capped at 20.
- Reuse the review layout for historical runs.
- Build settings sections for Outlook directory, AI config, and data management.

## Module Boundaries

### Main Process

- `outlook/`
  - advisory directory detection
  - directory validation
  - PST discovery
- `runs/`
  - run lifecycle
  - SQLite-backed run persistence
  - latest/historical retrieval
- `settings/`
  - persisted MVP settings only
- `ipc/`
  - onboarding, runs, settings channels only

### Renderer

- `app/`
  - route shell and top-level layout
- `components/onboarding/`
  - directory picker, validation list, connection card
- `components/runs/`
  - toolbar, summary, list, detail, evidence, history table
- `components/settings/`
  - outlook, AI, data management sections

### Shared

- `types/`
  - DTOs for onboarding, runs, settings
- `schemas/`
  - Zod validation for IPC payloads and responses

## Storage & Migration Approach

- Keep SQLite and better-sqlite3.
- Prefer a schema path centered on:
  - `outlook_source_config`
  - `extraction_runs`
  - `discovered_pst_files`
  - `processed_emails`
  - `action_items`
  - `item_evidence`
- Active run review retrieval must read from the run tables above, not from config-backed JSON snapshots.
- Existing legacy tables may remain temporarily, but the active MVP code must not depend on feedback, notifications, or mode-switching tables.
- If a schema reset is cheaper than incremental compatibility, allow it during the MVP reset because the project is still pre-release.

## IPC Surface

- `onboarding.getStatus`
- `onboarding.detectOutlookDir`
- `onboarding.validateOutlookDir`
- `onboarding.testConnection`
- `onboarding.complete`
- `runs.start`
- `runs.getLatest`
- `runs.getById`
- `runs.listRecent`
- `settings.get`
- `settings.update`
- `settings.getDataSummary`
- `settings.clearRuns`
- `settings.rebuildIndex`

## Verification Strategy

- Quality gates:
  - `pnpm run typecheck`
  - `pnpm run lint`
- Required focused tests:
  - Outlook directory validation
  - PST discovery
  - onboarding completion rules
  - run persistence and retrieval
  - item/evidence binding
  - latest-run review rendering
  - recent-runs table rendering
- Remove or quarantine tests for:
  - feedback
  - notifications
  - mode switching
  - multi-client onboarding
  - calendar history
  - inline editing

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Temporary coexistence of legacy files | Needed to regain a compileable repo incrementally | Immediate full deletion risks breaking build and losing context in one step |
