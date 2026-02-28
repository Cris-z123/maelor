# Implementation Plan: User Interaction System

**Branch**: `002-user-interaction-system` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification based on user interaction design document v1.10

## Summary

Implement comprehensive user interaction system for mailCopilot desktop application, including first-time setup wizard, daily report viewing with confidence-based item classification, AI feedback system, manual/scheduled report generation, historical report search, settings management, and desktop notifications. The system prioritizes privacy-first architecture with local-only data storage, dual display modes (default/AI explanation), and visual design following professional aesthetic principles.

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20.x
**Primary Dependencies**:
- Electron 29.4.6 (desktop framework with sandbox, contextIsolation, single-instance lock)
- React 18 (UI framework)
- Tailwind CSS v3.4 + shadcn/ui (styling system)
- Zustand 4.5 (state management)
- better-sqlite3 11.10.0 (database with field-level AES-256-GCM encryption)
- Zod (runtime validation)
- Lucide React (icons)
- Inter (variable font)

**Storage**: SQLite (better-sqlite3) with field-level encryption, WAL mode
**Testing**: Vitest (unit/integration), 80%/70% coverage threshold, security-critical modules 100%
**Target Platform**: Desktop (Windows, macOS, Linux)
**Project Type**: Electron desktop application (main process + renderer process)
**Performance Goals**:
- Report generation from 100 emails < 2 minutes
- Historical search < 1 second for 10k items
- Application startup < 3 seconds
- Expand/collapse animation < 300ms
- UI responsive during LLM processing (cancellable operations)

**Constraints**:
- WCAG AA color contrast compliance
- Window size: min 800x600, recommended 1200x800
- Email size limit: 20MB per email
- Animation timing: 150ms (fast), 300ms (standard), 500ms (slow)
- Toast duration: success 3s, error 5s, warning 4s, info 3s

**Scale/Scope**:
- 9 user stories (6 P1, 3 P2)
- 95 functional requirements
- 6 main pages/views (Onboarding, Home, History, Settings, and dialogs)
- 20 success criteria
- Support for 3 email clients (Thunderbird, Outlook, Apple Mail)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Implementation Compliance

✅ **I. Privacy-First Architecture**
- Remote mode default with explicit disclosure: **COMPLIANT** - Onboarding wizard explicitly describes data transmission scope
- Complete offline option: **COMPLIANT** - Local mode (Ollama) fully supported with network-layer blocking
- No cloud backup: **COMPLIANT** - All data strictly device-bound, no sync/backup features
- Single device binding: **COMPLIANT** - Data loss on system reinstall/device replacement by design

✅ **II. Anti-Hallucination Mechanism**
- Mandatory source association: **COMPLIANT** - All items display source email metadata with "Copy Search Term" for verification
- Zod validation: **COMPLIANT** - LLM output validated with ItemSchema (source_email_indices, evidence, confidence)
- Degradation instead of loss: **COMPLIANT** - Low confidence items (< 0.6) marked "[来源待确认]" and retained, not discarded
- Confidence calculation: **COMPLIANT** - Rules 50% + LLM 50%, schema validation adjusts to 60%/20% capped at 0.6
- Multi-email association: **COMPLIANT** - item_email_refs table supports many-to-many relationships

✅ **III. Data Minimization & Retention**
- Immediate body cleanup: **COMPLIANT** - Email body cleared immediately after processing, only metadata retained
- Metadata-only retention: **COMPLIANT** - Sender hash, desensitized subject, timestamp retained (90-day default, configurable)
- Field-level encryption: **COMPLIANT** - AES-256-GCM for sensitive fields (content_encrypted, config_value)
- Device-bound keys: **COMPLIANT** - Keys auto-generated via Electron safeStorage, no user password required
- No recovery path: **COMPLIANT** - Key changes result in permanent data loss (intentional design)

✅ **IV. Mode Switching & Network Isolation**
- Hot mode switching: **COMPLIANT** - Settings page mode switch waits for current batch completion, no restart required
- Queue during switch: **COMPLIANT** - New tasks enter queue during processing, new mode applies after batch completes
- No auto-degradation: **COMPLIANT** - Local mode failures block functionality with explicit error, no automatic fallback
- Network interceptor: **COMPLIANT** - Local mode physically blocks non-local requests at network layer
- Update policy: **COMPLIANT** - Remote mode enables auto-update on startup, local mode requires manual trigger

✅ **V. Testing & Quality Standards**
- Test pyramid (no E2E): **COMPLIANT** - Unit 60% (utilities, security algorithms), Integration 40% (database, IPC, LLM adapters)
- Coverage requirements: **COMPLIANT** - ≥80% line, ≥70% branch, security-critical modules 100% branch
- Test-first enforcement: **COMPLIANT** - Red-Green-Refactor cycle required before implementation
- Integration test focus: **COMPLIANT** - IPC communication, database operations, UI component integration
- Security testing: **COMPLIANT** - QuickJS sandbox testing, SQL injection defense, memory residue detection, mode switch queue testing

✅ **VI. Single Instance & Concurrency Control**
- Single instance lock: **COMPLIANT** - `app.requestSingleInstanceLock()` enforced, second instance quits immediately
- Window focus: **COMPLIANT** - Second-instance events focus existing window with notification
- Database safety: **COMPLIANT** - Single-instance enforcement prevents SQLite concurrent write corruption
- Batch processing state: **COMPLIANT** - State flags prevent race conditions in mode switches and batch processing

✅ **VII. Observability & Performance**
- Structured logging: **COMPLIANT** - All events use structured logging format, no sensitive data in logs
- Performance benchmarks: **COMPLIANT** - 1000 report queries <100ms, 50 emails ~35s (local) / ~18s (remote)
- Resource limits: **COMPLIANT** - 20MB email limit, 100k char truncation, 50 emails/batch, QuickJS 128MB/5s limits
- Database optimization: **COMPLIANT** - WAL mode enabled, synchronous=NORMAL, writes in transactions
- Memory management: **COMPLIANT** - Sensitive data cleared with Buffer.fill(0) after use

### Technology Stack Compliance

✅ **Framework & Security**
- Electron 29.4.6 with sandbox, contextIsolation: **COMPLIANT** - Specified in tech-architecture.md, constitution-required
- Tailwind CSS v3.4 + shadcn/ui: **COMPLIANT** - Specified for utility-first styling, component library
- React 18 + TypeScript 5.4: **COMPLIANT** - Error boundary isolation, Zod runtime validation
- Zustand 4.5 for state management: **COMPLIANT** - In-memory encryption for sensitive state

✅ **Data & Configuration**
- better-sqlite3 11.10.0: **COMPLIANT** - Field-level AES-256-GCM encryption, WAL mode
- JSON Schema + Ajv for configuration: **COMPLIANT** - HMAC-SHA256 signature anti-tampering
- Electron safeStorage for key management: **COMPLIANT** - Auto-generated keys, no user input required
- QuickJS (WASM) for rule execution: **COMPLIANT** - Zero-permission sandbox, 128MB/5s limits

✅ **IPC & Security**
- Zod Schema for LLM output validation: **COMPLIANT** - Structured output validation, auto-retry, fallback to unverified
- CSP policy: **COMPLIANT** - `default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com` (remote), `'self'` (local)
- IPC whitelist compliance (22 channels across 8 categories): **COMPLIANT** - All UI interactions use approved channels

### Post-Design Re-Check

✅ **Data Model Design**
- Anti-hallucination enforcement: **COMPLIANT** - All items include source_email_indices, evidence, confidence fields
- Degradation strategy: **COMPLIANT** - Low confidence items marked with visual indicators, not discarded
- Field-level encryption: **COMPLIANT** - Sensitive fields use AES-256-GCM encryption in database schema
- Feedback integration: **COMPLIANT** - feedback_type field added to todo_items table (per constitution v1.3.0)

✅ **UI/UX Design**
- Empty state handling: **COMPLIANT** - No blank screens, actionable empty states with clear guidance
- Error handling: **COMPLIANT** - Specific, actionable error messages (e.g., "Unable to connect to AI service", "Invalid email path")
- Accessibility: **COMPLIANT** - WCAG AA color contrast, ARIA labels, keyboard navigation support
- Performance: **COMPLIANT** - Virtual scrolling for large lists, 300ms debounce on search, pagination (20 items/page)

### Compliance Summary

**Status**: ✅ ALL GATES PASSED

No constitution violations detected. Implementation proceeds with full compliance to all 7 core principles and technology stack constraints.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-interaction-system/
├── spec.md              # Feature specification (COMPLETED)
├── plan.md              # This file
├── research.md          # Phase 0: Technical research and decisions
├── data-model.md        # Phase 1: Data model and entity relationships
├── quickstart.md        # Phase 1: Developer quickstart guide
├── contracts/           # Phase 1: API contracts and schemas
│   ├── ipc-channels.md  # IPC channel definitions
│   ├── zod-schemas.md   # Zod validation schemas
│   └── ui-components.md # UI component contracts
└── tasks.md             # Phase 2: Implementation tasks (NOT created by this command)
```

### Source Code (repository root)

```text
src/
├── main/                    # Main process (backend)
│   ├── onboarding/          # First-time setup wizard
│   │   ├── OnboardingManager.ts
│   │   └── ipc-handlers.ts
│   ├── config/              # Configuration management
│   │   └── ConfigManager.ts  # (EXISTS - extend for UI settings)
│   ├── llm/                 # LLM adapters (EXISTS - extend for UI progress)
│   ├── database/            # Database layer (EXISTS - extend schema)
│   ├── notifications/       # Desktop notifications (NEW)
│   │   ├── NotificationManager.ts
│   │   └── NotificationBuilder.ts
│   └── update/              # Auto-update manager (EXISTS - extend UI)
│
├── renderer/                # Renderer process (frontend UI)
│   ├── components/
│   │   ├── onboarding/      # Setup wizard components (NEW)
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── EmailClientConfig.tsx
│   │   │   ├── ScheduleConfig.tsx
│   │   │   └── LLMConfig.tsx
│   │   ├── reports/         # Daily report display (NEW)
│   │   │   ├── ReportView.tsx
│   │   │   ├── SummaryBanner.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemDetails.tsx
│   │   │   ├── FeedbackButtons.tsx
│   │   │   └── ItemInlineEdit.tsx  # P2 feature
│   │   ├── generation/      # Report generation UI (NEW)
│   │   │   ├── ManualGenerateButton.tsx
│   │   │   ├── ConfirmationDialog.tsx
│   │   │   ├── ProgressDialog.tsx
│   │   │   └── CompletionDialog.tsx
│   │   ├── history/         # Historical reports (NEW)
│   │   │   ├── HistoryView.tsx
│   │   │   ├── CalendarView.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── DateFilter.tsx
│   │   │   └── ReportList.tsx
│   │   ├── settings/        # Settings page (NEW)
│   │   │   ├── SettingsView.tsx
│   │   │   ├── EmailConfigSection.tsx
│   │   │   ├── ScheduleSection.tsx
│   │   │   ├── LLMConfigSection.tsx
│   │   │   ├── DisplaySettingsSection.tsx
│   │   │   ├── NotificationSection.tsx
│   │   │   ├── DataManagementSection.tsx
│   │   │   └── AboutSection.tsx
│   │   └── shared/          # Shared UI components
│   │       ├── Toast.tsx
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Dialog.tsx
│   │       ├── Progress.tsx
│   │       └── EmptyState.tsx
│   ├── stores/              # Zustand state management (NEW)
│   │   ├── onboardingStore.ts
│   │   ├── reportStore.ts
│   │   ├── generationStore.ts
│   │   ├── historyStore.ts
│   │   ├── settingsStore.ts
│   │   └── notificationStore.ts
│   ├── services/           # Frontend services (NEW)
│   │   └── ipc.ts           # IPC client abstraction
│   ├── hooks/               # React hooks (NEW)
│   │   ├── useToast.ts
│   │   ├── useDialog.ts
│   │   ├── useProgress.ts
│   │   └── useInlineEdit.ts  # P2 feature
│   └── styles/              # Tailwind CSS utilities
│       └── theme.css        # Custom theme (智捷蓝 #4F46E5, etc.)
│
├── shared/                  # Shared between processes
│   ├── types/               # TypeScript types (EXTEND)
│   │   ├── onboarding.ts
│   │   ├── reports.ts
│   │   ├── history.ts
│   │   └── settings.ts
│   └── schemas/             # Zod schemas (EXTEND)
│       ├── onboarding.ts
│       ├── reports.ts
│       └── settings.ts
│
tests/                        # Test suites (NEW/EXTEND)
├── unit/
│   ├── renderer/
│   │   ├── components/      # UI component tests
│   │   ├── stores/          # State management tests
│   │   └── hooks/           # Hook tests
│   └── main/
│       ├── onboarding/      # Setup wizard tests
│       ├── notifications/   # Notification tests
│       └── config/          # Config management tests
└── integration/
    ├── ipc/                 # IPC communication tests
    ├── database/            # Database integration tests
    └── ui/                  # UI flow integration tests
```

**Structure Decision**: Electron desktop application with main/renderer process separation. Main process handles business logic (onboarding, notifications, config management). Renderer process contains React UI components organized by feature (onboarding, reports, generation, history, settings). Shared layer contains types and schemas for IPC communication. This aligns with constitution-mandated architecture and existing codebase structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. This section intentionally left blank.

---

## Phase 0: Research & Technical Decisions

### Research Tasks

1. **Email Client Auto-Detection Strategy**
   - Research: How to auto-detect Thunderbird, Outlook, Apple Mail installation paths across Windows/macOS/Linux
   - Decision needed: Platform-specific default paths vs registry/manifest file detection
   - Output: `src/main/onboarding/EmailClientDetector.ts` design

2. **Desktop Notification Implementation**
   - Research: Electron Notification API vs platform-specific notification systems
   - Decision needed: How to implement do-not-disturb mode (22:00-08:00) and notification aggregation (3-minute window)
   - Output: `src/main/notifications/NotificationManager.ts` design

3. **Inline Editing State Management**
   - Research: Best practices for inline editing with auto-save in React/Zustand
   - Decision needed: Optimistic UI updates vs validation-first approach
   - Output: `src/renderer/hooks/useInlineEdit.ts` design (P2 feature)

4. **Search Performance Optimization**
   - Research: SQLite full-text search (FTS5) vs LIKE queries for historical report search
   - Decision needed: Index strategy for searching across 10k+ items
   - Output: Database schema extensions for search optimization

5. **Calendar Component Selection**
   - Research: shadcn/ui calendar component capabilities vs custom implementation
   - Decision needed: Whether to extend shadcn Calendar or build custom component
   - Output: `src/renderer/components/history/CalendarView.tsx` design

6. **Progress Dialog Updates from Main Process**
   - Research: IPC patterns for real-time progress updates during long-running tasks
   - Decision needed: Event-based vs polling approach for progress updates
   - Output: IPC channel design for progress reporting

### Technology Selection Decisions

| Decision | Chosen Technology | Rationale | Alternatives Considered |
|----------|-------------------|-----------|-------------------------|
| **UI Component Library** | shadcn/ui + Tailwind CSS | Constitution-required, highly customizable, no runtime dependencies | Material-UI (too heavy), Chakra UI (less customizability) |
| **State Management** | Zustand | Constitution-required, lightweight, simple API for encrypted state | Redux (too complex), React Context (no persistence) |
| **Form Validation** | Zod | Constitution-required, TypeScript-first, runtime validation | Yup (less type safety), Joi (not TypeScript-native) |
| **Icons** | Lucide React | Constitution-required, lightweight, tree-shaking support | heroicons (React-specific), FontAwesome (too heavy) |
| **Calendar View** | shadcn/ui Calendar + custom extensions | Reusable component, extendable for blue-dot indicators | FullCalendar (too heavy), react-calendar (less customizable) |
| **Rich Text Editor** |textarea with auto-expand | Simple, meets requirements (max 500 chars), no formatting needed | TipTap (overkill), Quill (too complex) |
| **Date Picker** | shadcn/ui Popover + Calendar | Consistent with calendar view, meets needs (hour/minute selection) | react-datepicker (less consistent) |
| **Animation Library** | CSS transitions + Framer Motion (P2) | Constitution timing specs, CSS sufficient for MVP, Framer Motion for P2 animations | GSAP (too heavy), React Transition Group (less features) |

### Best Practices Research

1. **Electron Security Best Practices**
   - contextIsolation: enabled (constitution-required)
   - sandbox: enabled (constitution-required)
   - Node.js integration in renderer: disabled
   - CSP policy: `default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com`

2. **Zustand State Management Patterns**
   - Separate stores by feature (onboarding, reports, history, settings)
   - Encrypted state wrapper for sensitive data (config values)
   - Subscribe to specific slices to avoid unnecessary re-renders

3. **Desktop Notification UX Patterns**
   - Non-intrusive: timeout-based dismissal (3s-5s), not persistent
   - Actionable: click handlers for "View Report", "Retry", etc.
   - Respectful: do-not-disturb mode during 22:00-08:00

4. **React Component Organization**
   - Feature-based folder structure (onboarding/, reports/, history/, settings/)
   - Barrel exports (index.ts) for clean imports
   - Shared components in separate directory

5. **Testing Strategies**
   - Unit tests: Vitest for components, stores, hooks
   - Integration tests: IPC communication, database operations
   - Security tests: Field encryption validation, IPC whitelist enforcement

---

## Phase 1: Design & Contracts

### Data Model Extensions

**See**: `data-model.md` (to be generated)

Key entities to design:
- **OnboardingState**: Tracks setup wizard progress (step 1/2/3 completion, email client path, schedule, LLM config)
- **ReportDisplayItem**: Enhanced item with confidence score, source status, feedback status, inline edit state
- **NotificationSettings**: Desktop notification preferences (enabled, do-not-disturb, sound)
- **SearchQuery**: Historical search parameters (keywords, date range, filters)

### API Contracts

**See**: `contracts/` directory (to be generated)

IPC channels to define:
1. **onboarding:get-status** - Get onboarding wizard completion status
2. **onboarding:set-step** - Update onboarding step progress
3. **onboarding:detect-email-client** - Auto-detect email client path
4. **onboarding:validate-email-path** - Validate email client configuration
5. **onboarding:test-llm-connection** - Test LLM API connectivity
6. **generation:start** - Start manual report generation
7. **generation:cancel** - Cancel in-progress generation
8. **generation:get-progress** - Get real-time progress updates
9. **reports:get-today** - Get today's report
10. **reports:get-by-date** - Get report for specific date
11. **reports:search** - Search historical reports
12. **reports:expand-item** - Get item details with source emails
13. **reports:submit-feedback** - Submit accuracy feedback (OK/X)
14. **reports:copy-search-term** - Copy search keywords to clipboard
15. **reports:inline-edit** - Update item fields inline (P2)
16. **settings:get-all** - Get all settings
17. **settings:update** - Update setting
18. **settings:cleanup-data** - Clean old data
19. **settings:destroy-feedback** - Delete all feedback data
20. **notifications:send-test** - Send test notification
21. **notifications:configure** - Update notification settings

### UI Component Contracts

**See**: `contracts/ui-components.md` (to be generated)

Component specifications:
- Props interfaces (TypeScript)
- Event handlers (onSubmit, onCancel, onExpand, etc.)
- Styling contracts (Tailwind CSS classes, color palette)
- Accessibility (ARIA labels, keyboard navigation)
- State management (Zustand store integration)

### Quickstart Guide

**See**: `quickstart.md` (to be generated)

Developer onboarding:
- Prerequisites (Node.js 20, pnpm 8)
- Installation steps (`pnpm install`)
- Development workflow (`pnpm dev`, `pnpm test`)
- Code organization overview
- Testing guidelines
- Common tasks (add component, add IPC channel, update schema)

---

## Next Steps

1. ✅ Constitution Check: **PASSED** - No violations, full compliance
2. ⏳ **Phase 0**: Generate `research.md` with technical decisions and best practices
3. ⏳ **Phase 1**: Generate `data-model.md`, `contracts/`, `quickstart.md`
4. ⏳ **Phase 1**: Update agent context with new technology stack
5. ⏳ **Phase 2**: Run `/speckit.tasks` to generate implementation task breakdown

**Ready for Phase 0 Research** ✓
