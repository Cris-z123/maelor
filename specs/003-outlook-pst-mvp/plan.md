# Implementation Plan: Outlook PST Direct-Connect MVP

**Branch**: `003-outlook-pst-mvp` | **Date**: 2026-03-31 | **Spec**: `/specs/003-outlook-pst-mvp/spec.md`
**Input**: Feature specification from `/specs/003-outlook-pst-mvp/spec.md`

## Summary

Reset mailCopilot around a single Windows/classic-Outlook/PST-only MVP. Replace the multi-feature drift with a Spec-Kit-driven implementation path, freeze `001` and `002`, and cut the codebase down to one compileable product surface: onboarding, latest-run review, and history/settings. The active implementation path also locks five technical constraints: Outlook auto-detection must be advisory until validation/completion, active run-review data must live in SQLite run tables, preload/renderer contracts must expose only onboarding, runs, and settings APIs, active runtime code must use domain naming instead of `mvp`-prefixed product namespaces, and non-MVP repository modules/tests must be physically deleted or explicitly quarantined instead of merely surviving behind narrowed entrypoints.

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20.x  
**Primary Dependencies**: Electron 29.4.6, React 18, Vite 7, Zustand 4.5, Zod 3.22, Tailwind CSS 3.4, shadcn/ui, better-sqlite3 11.10, openai 4.x, pst-extractor  
**Storage**: SQLite via better-sqlite3, local filesystem for Outlook PST discovery  
**Testing**: Vitest (unit/integration/security), ESLint, TypeScript compiler  
**Target Platform**: Windows desktop runtime for classic Outlook data directories; Windows self-signed internal-test GitHub Release packaging plus macOS experimental packaging  
**Project Type**: Electron desktop application  
**Performance Goals**: latest-run shell loads without renderer crashes; PST discovery completes with bounded UI feedback; recent runs limited to 20 rows  
**Constraints**: single active spec, PST-only runtime scope, no unsupported client surfaces in code or UI, no `mvp`-prefixed active runtime naming, no dormant non-MVP modules in active repository roots, typecheck/lint required before expansion, release tags must match the packaged application version, Windows internal-test releases require signing credentials, startup failures must terminate cleanly, and schema mismatches must migrate or block startup
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
- **Naming & Boundary Discipline**: Pass only if active code uses domain names and deletes unsupported runtime surfaces instead of keeping parallel `mvp`-named implementations.
- **True Purge Requirement**: Pass only if active source/test roots and compile manifests stop carrying dormant feedback, notification, mode-switching, auto-update, legacy report, and other non-MVP product modules.

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

**Structure Decision**: Preserve the Electron split (`main` / `renderer` / `shared`) but narrow active implementation to Outlook onboarding, run management, and settings. Legacy modules are transitional only and should be deleted or quarantined from active builds; active code should converge on domain names instead of `mvp` compatibility naming.

## True Purge Gap

The repository still contains pre-MVP product surfaces that were only excluded from the main runtime path, not actually removed. The remaining purge must delete or quarantine:

- legacy shared runtime contracts that still declare non-MVP APIs
- stale `tsconfig` include entries that reference removed compatibility files
- main-process mode switching, notification, feedback/data-retention cleanup, and update-policy code paths that are no longer part of the product
- renderer report/feedback/settings surfaces and tests that describe removed workspaces instead of the narrowed latest-run/history/settings UI

This gap means Phase 1 is not complete until repository-level deletion matches the narrowed product boundary.

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
- Narrow preload and renderer-facing APIs to the onboarding/runs/settings contract only.
- Remove `mvp`-prefixed active runtime modules/types/config keys in favor of final domain naming.
- Delete dormant non-MVP source modules, tests, and compile-manifest references instead of leaving them inside active repository roots.
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

### Phase 6: Release Engineering

- Add repository-managed release preparation so maintainers can bump the app version and generate changelog content from commit history without hand-editing release notes.
- Extend electron-builder packaging to emit versioned Windows and macOS artifacts suitable for GitHub Release downloads.
- Replace the single-platform publish workflow with a tag-driven matrix build that verifies tag/version alignment and uploads the generated assets to the matching GitHub Release.
- Treat Windows as the only supported internal-test release target for now; keep macOS builds experimental until formal signing and notarization are implemented.
- Gate Windows release packaging on signing credentials and align public docs/release notes with the self-signed internal-test distribution boundary.
- Add startup-failure convergence so partial initialization cannot leave a background process or held SQLite lock after a failed launch.
- Replace warn-only schema version checks with ordered migrations, database backups, and fatal blocking on unsupported or failed upgrades.

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
  - persisted active product settings only
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
- No active shared/runtime namespace should be named `mvp`; the product surface should read as the only remaining product.
- No shared runtime declaration should keep legacy `llm`, `db`, `reports`, `generation`, `notifications`, update, or feedback operations once those surfaces are removed from the product.

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
- Config keys, DTO names, and active API modules should use durable domain names rather than temporary `mvp.*` or `Mvp*` labels.
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
- Required purge audit:
  - inspect `electron/preload.js`
  - inspect `src/shared/types/`
  - inspect active `tsconfig` include lists
  - confirm no non-MVP modules remain under active `src/` and `tests/` roots unless explicitly quarantined
- Required release audit:
  - verify `package.json` version matches release tag format `v<version>`
  - verify `CHANGELOG.md` contains a section for the prepared version
  - verify the release workflow emits versioned Windows and macOS artifact names
  - verify Windows internal-test packaging fails when signing credentials are missing
  - verify public docs describe Windows as self-signed internal test and macOS as experimental
  - verify startup failure exits without leaving a background process
  - verify supported schema upgrades migrate or fail with preserved backups
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
| Temporary coexistence of legacy files during transition | Needed only while moving to a compileable narrowed surface | Permanent parallel `mvp` naming or long-lived dual surfaces would hide scope debt instead of removing it |
