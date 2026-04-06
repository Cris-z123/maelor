# mailCopilot Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-04

## Active Feature

- `specs/003-outlook-pst-mvp/` is the only active implementation spec.
- `specs/001-email-item-traceability/` and `specs/002-user-interaction-system/` are historical reference only.

## Active Technologies

- Electron 29.4.6 with sandbox, contextIsolation, single-instance lock
- Tailwind CSS v3.4 + shadcn/ui for utility-first styling
- better-sqlite3 11.10.0 with WAL mode and existing field-level encryption support
- TypeScript 5.4 + Node.js 20.x
- React 18 renderer with Vite 7

## MVP Scope Lock

- Windows only
- Classic Outlook only
- PST only
- Direct Outlook data-directory connection only
- No feedback loop, notifications, multi-client support, calendar history, inline editing, or mode switching in the active MVP

## Project Structure

```text
src/
tests/
specs/003-outlook-pst-mvp/
.specify/
```

## Commands

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:integration`

## Code Style

- TypeScript 5.4 + Node.js 20.x: Follow standard conventions
- Every code change must map to a task in `specs/003-outlook-pst-mvp/tasks.md`
- Scope changes must update `spec.md`, `plan.md`, and `tasks.md` before code

## Testing Requirements

Per constitution v1.1.0:

- Unit test line coverage >= 80%, branch coverage >= 70%
- Security-critical modules (encryption, validation, desensitization, sandbox) MUST achieve 100% branch coverage

## Recent Changes

- 003-outlook-pst-mvp: Removed remaining active notification behavior and legacy notification test coverage from the MVP runtime surface
- 003-outlook-pst-mvp: Added Phase 4 IPC and renderer coverage for recent runs and settings
- 003-outlook-pst-mvp: Established the single active Spec-Kit feature for the Outlook PST direct-connect MVP

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
