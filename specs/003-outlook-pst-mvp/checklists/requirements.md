# Requirements Checklist: Outlook PST Direct-Connect MVP

**Purpose**: Track whether the active MVP implementation stays inside the 003 scope and meets the narrowed product requirements.  
**Created**: 2026-03-31  
**Feature**: `/specs/003-outlook-pst-mvp/spec.md`

## Scope Lock

- [x] CHK001 Only `specs/003-outlook-pst-mvp/` is treated as active for implementation
- [x] CHK002 `001` and `002` are clearly marked as historical reference only
- [x] CHK003 No code path exposes unsupported clients or input formats in the active MVP flow

## Onboarding

- [x] CHK004 Onboarding contains exactly three steps: Outlook directory, PST validation, AI configuration
- [x] CHK005 Auto-detection failure does not block configuration
- [x] CHK006 Missing readable PST blocks onboarding completion
- [x] CHK007 Failed AI connection blocks onboarding completion

## Run & Review

- [x] CHK008 The latest-results page is the default configured landing page
- [x] CHK009 A user can manually start a scan
- [ ] CHK010 Every displayed item has at least one evidence record
- [x] CHK011 Low-confidence items use warning styling and expanded evidence
- [x] CHK012 Copy-search-term is available from item review

## History & Settings

- [x] CHK013 History is a table only and is limited to the most recent 20 runs
- [x] CHK014 Historical runs reuse the same review layout as the latest run
- [x] CHK015 Settings expose only Outlook directory, AI configuration, and data management

## Quality Gates

- [x] CHK016 `pnpm run typecheck` passes
- [x] CHK017 `pnpm run lint` passes
- [x] CHK018 Legacy non-MVP tests are removed or quarantined from the active validation path
