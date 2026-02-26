# Implementation Plan: Email Item Traceability & Verification System

**Branch**: `001-email-item-traceability` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-email-item-traceability/spec.md`
**Architecture Version**: v2.7 (Updated 2026-02-05)

**Note**: This plan reflects updates from the technical architecture document (docs/tech-architecture.md v2.7), including:
- Frontend tech stack: TailwindCSS, shadcn/ui, Lucide-React, Inter font
- Revised low-confidence handling: downgrade to database with "[来源待确认]" tagging instead of dropping
- Extended retention support: -1 (permanent) option added
- Optimized mode switching: hot switch after batch completion (no restart required)
- Unified confidence weighting: Rule engine 50% + LLM 50%, adjusts on failure
- Simplified feedback storage: Integrated into `todo_items` table, removed separate feedback.db
- Explicit traceability implementation: Search string + file path (display-only text, NO deep linking or clickable links per FR-004A)
- Email format parsing libraries specified: @kenjiuno/msgreader (MSG), pst-extractor (PST/OST)

## Summary

This feature implements a complete email item traceability and verification system for mailCopilot, enabling users to verify every extracted action item's source while maintaining privacy-first design. The system extracts action items from emails using dual-engine processing (rule engine + LLM), enforces mandatory source traceability, provides confidence-based visual warnings, and offers a local-only feedback system. The implementation uses Electron 29.4.6 with React 18 + TypeScript 5.4, field-level AES-256-GCM encryption for sensitive data, and supports both local (Ollama) and remote LLM modes with hot switching.

## Technical Context

**Language/Version**: TypeScript 5.4 + Node.js 20.x
**Primary Dependencies**:
  - Cross-platform: Electron 29.4.6
  - Frontend: React 18, Tailwind CSS v3.4, shadcn/ui, Lucide React, Inter (variable font)
  - State: Zustand 4.5
  - Database: better-sqlite3 11.10.0 with field-level AES-256-GCM encryption
  - Security: Electron safeStorage API, QuickJS (WASM) for rule sandbox
  - Validation: Zod Schema for runtime validation
  - Email: imapflow + mailparser (IMAP/POP3), @kenjiuno/msgreader/pst-extractor (Outlook formats)
  - Export: Puppeteer for PDF generation
  - Updates: electron-updater (GitHub Releases)

**Storage**: SQLite (better-sqlite3) with field-level encryption, WAL mode
**Testing**: Vitest + Node.js built-in test runner + custom integration test framework
  - Unit tests: 60% (utilities, security algorithms, pure functions)
  - Integration tests: 40% (database, IPC, LLM adapters, process locks)
  - Coverage: ≥85% line, ≥80% branch (100% for security-critical modules)

**Target Platform**: Desktop (Windows 10+, macOS 10.15+, Linux Ubuntu 20.04+)
**Project Type**: Electron desktop app (main process + renderer process architecture)
**Performance Goals**:
  - Email metadata extraction: ≤100ms per email (mid-range hardware)
  - Local LLM processing: ≤2s per email (Ollama 7B)
  - Report query: <100ms for 1000 reports
  - Batch processing: ~35s for 50 emails (local 7B) / ~18s (remote)
  - Bulk decryption: <500ms for 100 items

**Constraints**:
  - Privacy-first: No cloud backup, no cross-device sync, device-bound keys
  - Single-instance: Only one application instance allowed
  - Security: IPC whitelist (22 channels across 8 categories), CSP enforced, sandbox enabled
  - Resource limits: 20MB per email, 100k char body truncation, 50 emails/batch
  - Rule engine: 128MB memory, 5s timeout, QuickJS WASM sandbox
  - Data retention: Default 90 days (configurable 30/90/180/365/-1 where -1 = permanent)

**Scale/Scope**:
  - Single-device desktop app
  - Local storage only (no cloud services)
  - Designed for individual use (not multi-tenant)
  - Email archive processing: batches of 50 emails
  - Historical storage: Daily reports indefinitely (metadata retained per config)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Privacy-First Architecture ✅
- ✅ **Default Remote Mode**: System defaults to remote mode on first launch
- ✅ **Complete Offline Option**: Users can deploy Ollama/LocalAI and switch to local mode with network-layer blocking
- ✅ **No Cloud Backup**: All reports/configs bound to current device, no cross-device sync or password recovery
- ✅ **Single Device Binding**: Data access tied to device hardware, system reinstall/device change = permanent data loss
- **Implementation**: FR-030 through FR-040 specify dual-mode operation, FR-046 enforces device binding, T018a-T018b implement first-run disclosure per Principle I

### II. Anti-Hallucination Mechanism ✅
- ✅ **Mandatory Source Association**: Every item includes source_email_indices, evidence, confidence
- ✅ **Zod Schema Validation**: source_status field ('verified'/'unverified') enforced, items without valid sources NOT discarded
- ✅ **Degradation Instead of Loss**: Items without verified sources marked unverified, confidence≤0.4, tagged "[来源待确认]"
- ✅ **Confidence Calculation**: Unified scoring (rules 50% + LLM 50%), adjusts to 60%/20% on schema failure
- ✅ **Multi-Email Association**: item_email_refs table supports many-to-many relationships
- **Implementation**: FR-014 through FR-018 specify validation and degradation, FR-009 through FR-013 specify confidence calculation

### III. Data Minimization & Retention ✅
- ✅ **Immediate Body Cleanup**: Original email body cleared after processing (FR-044)
- ✅ **Metadata-Only Retention**: 90 days default, configurable 30/90/180/365/-1 days (FR-041, FR-042)
- ✅ **Field-Level Encryption**: AES-256-GCM for sensitive fields (FR-045)
- ✅ **Device-Bound Keys**: safeStorage API, no user password required (FR-046)
- ✅ **No Recovery Path**: System reinstall/device change = permanent data loss (FR-047)
- **Implementation**: FR-041 through FR-048 specify data retention and encryption

### IV. Mode Switching & Network Isolation ✅
- ✅ **Hot Mode Switching**: Mode changes wait for current batch completion, no restart required (FR-033)
- ✅ **Queue During Switch**: New tasks queued during batch processing (FR-034)
- ✅ **No Auto-Degradation**: Local mode failures block functionality, no automatic fallback (FR-036, FR-037)
- ✅ **Network Interceptor**: Local mode physically blocks non-local requests (FR-040)
- ✅ **Update Policy**: Remote mode auto-checks on startup, local mode requires manual trigger (FR-038, FR-039)
- **Implementation**: FR-030 through FR-040 specify dual-mode operation

### V. Testing & Quality Standards ✅
- ✅ **Test Pyramid (No E2E)**: Unit 60%, Integration 40%
- ✅ **Coverage Requirements**: Unit ≥85% line, ≥80% branch; Security-critical 100% branch
- ✅ **Test-First Enforcement**: Red-Green-Refactor cycle strictly enforced
- ✅ **Integration Test Focus**: New library contracts, IPC communication, database operations
- ✅ **Security Testing**: QuickJS sandbox escape, SQL injection, memory residue, single-instance lock
- **IPC Compliance**: IPC whitelist validation test (T109a) ensures exactly 22 channels registered across 8 categories per constitution Development Workflow section
- **Implementation**: Testing section in tech-architecture.md specifies test strategy

### VI. Single Instance & Concurrency Control ✅
- ✅ **Single Instance Lock**: app.requestSingleInstanceLock() on startup (FR-059)
- ✅ **Window Focus**: Second-instance events focus existing window (FR-061)
- ✅ **Database Safety**: Single-instance enforcement prevents SQLite corruption
- ✅ **Batch Processing State**: Mode switches use state flags to prevent race conditions
- **Implementation**: FR-059 through FR-061 specify single-instance enforcement

### VII. Observability & Performance ✅
- ✅ **Structured Logging**: All events use structured format, no sensitive data in logs
- ✅ **Performance Benchmarks**: 1000 reports <100ms, 100 decrypt <500ms, 50 emails ~35s local / ~18s remote
- ✅ **Resource Limits**: 20MB email limit, 100k char truncation, 50 email batches, 128MB QuickJS limit, 5s timeout
- ✅ **Database Optimization**: WAL mode, synchronous=NORMAL, all writes in transactions
- ✅ **Memory Management**: Buffer.fill(0) after use for sensitive data
- **Implementation**: FR-056 through FR-058 specify timeouts and limits, FR-011 through FR-013 specify confidence display

### Summary
✅ **ALL CONSTITUTIONAL REQUIREMENTS SATISFIED**

No violations detected. This feature implementation fully adheres to all seven core principles of the mailCopilot constitution.

## Project Structure

### Documentation (this feature)

```text
specs/001-email-item-traceability/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Technology research and decisions
├── data-model.md        # Phase 1 output - Database schema and entity relationships
├── quickstart.md        # Phase 1 output - Developer onboarding guide
├── contracts/           # Phase 1 output - API contracts (OpenAPI/GraphQL schemas)
│   ├── llm-service.yaml     # LLM adapter interface
│   ├── database-operations.yaml  # Database query contracts
│   └── ipc-protocol.yaml    # IPC channel schemas
└── tasks.md             # Phase 2 output - Implementation tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
mailCopilot/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── app/
│   │   │   ├── single-instance.ts    # Single-instance lock management
│   │   │   ├── lifecycle.ts          # App lifecycle handlers
│   │   │   └── mode-manager.ts       # Hot mode switching logic
│   │   ├── security/
│   │   │   ├── encryption.ts         # Field-level AES-256-GCM encryption
│   │   │   ├── key-manager.ts        # Device key management (safeStorage)
│   │   │   ├── desensitization.ts    # PII redaction rules
│   │   │   └── network-interceptor.ts # Network layer blocking (local mode)
│   │   ├── database/
│   │   │   ├── schema.ts             # SQLite schema definition
│   │   │   ├── migrations.ts         # Database migration scripts
│   │   │   ├── repositories/         # Data access layer
│   │   │   │   ├── emails.repo.ts
│   │   │   │   ├── items.repo.ts
│   │   │   │   ├── reports.repo.ts
│   │   │   │   └── feedback.repo.ts  # Integrated into todo_items table
│   │   │   └── cleanup.ts            # Scheduled data retention cleanup
│   │   ├── email-processing/
│   │   │   ├── parsers/              # Email format parsers
│   │   │   │   ├── eml.parser.ts     # RFC 5322 .eml format
│   │   │   │   ├── msg.parser.ts     # Outlook MSG format (@kenjiuno/msgreader)
│   │   │   │   ├── pst.parser.ts     # Outlook PST/OST format (pst-extractor)
│   │   │   │   ├── mbox.parser.ts    # Unix mbox format
│   │   │   │   └── html.parser.ts    # Exported HTML format
│   │   │   ├── metadata-extractor.ts # Message-ID/fingerprint extraction
│   │   │   ├── traceability-generator.ts # Search string + file path
│   │   │   └── duplicate-detector.ts  # SHA-256 duplicate detection
│   │   ├── llm/
│   │   │   ├── adapter-factory.ts    # LLM service factory (local/remote)
│   │   │   ├── local-adapter.ts      # Ollama/LocalAI adapter
│   │   │   ├── remote-adapter.ts     # Third-party LLM API adapter
│   │   │   ├── output-validator.ts   # Zod schema validation + degradation
│   │   │   └── confidence-calculator.ts # Rule 50% + LLM 50% scoring
│   │   ├── rules/
│   │   │   ├── sandbox.ts            # QuickJS WASM sandbox wrapper
│   │   │   ├── engine.ts             # Rule execution engine
│   │   │   └── default-rules.ts      # Built-in keyword/sender/deadline rules
│   │   ├── reports/
│   │   │   ├── generator.ts          # Daily report generation
│   │   │   ├── template-engine.ts    # Markdown/PDF rendering
│   │   │   └── export.ts             # Unencrypted file export
│   │   ├── config/
│   │   │   ├── manager.ts            # Config loading/saving (encrypted)
│   │   │   ├── schema.ts             # JSON Schema validation
│   │   │   └── validation.ts         # Ajv validation + HMAC signing
│   │   ├── updates/
│   │   │   ├── manager.ts            # Auto-update logic (GitHub Releases)
│   │   │   └── signature-verifier.ts # Code signature verification
│   │   └── ipc/
│   │       ├── channels.ts           # IPC channel definitions (whitelist: 6)
│   │       └── handlers/             # IPC request handlers
│   │           ├── llm.handler.ts
│   │           ├── database.handler.ts
│   │           ├── config.handler.ts
│   │           ├── updates.handler.ts
│   │           └── email.handler.ts
│   │
│   ├── renderer/                # Electron renderer process (React UI)
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── reports/              # Report viewing components
│   │   │   │   ├── DailyReportView.tsx
│   │   │   │   ├── ActionItemCard.tsx
│   │   │   │   ├── SourceMetadata.tsx
│   │   │   │   ├── ConfidenceBadge.tsx
│   │   │   │   └── FeedbackButtons.tsx
│   │   │   ├── settings/             # Settings page components
│   │   │   │   ├── ModeSwitchCard.tsx
│   │   │   │   ├── RetentionConfig.tsx
│   │   │   │   ├── FeedbackStats.tsx
│   │   │   │   └── DataManagement.tsx
│   │   │   └── layout/
│   │   │       ├── MainWindow.tsx
│   │   │       └── Navigation.tsx
│   │   ├── stores/
│   │   │   └── app-store.ts          # Zustand state management
│   │   ├── services/
│   │   │   └── ipc-client.ts         # IPC communication layer
│   │   ├── utils/
│   │   │   └── validation.ts         # Zod schemas for UI inputs
│   │   └── styles/
│   │       └── globals.css           # Tailwind CSS imports
│   │
│   └── shared/                   # Shared types and utilities
│       ├── types/
│       │   ├── email.types.ts
│       │   ├── item.types.ts
│       │   ├── report.types.ts
│       │   └── config.types.ts
│       └── constants/
│           ├── confidence-levels.ts
│           └── retention-periods.ts
│
├── tests/
│   ├── unit/                     # 60% - Pure function and utility tests
│   │   ├── security/
│   │   │   ├── encryption.test.ts     # AES-256-GCM encryption tests
│   │   │   ├── desensitization.test.ts # PII redaction tests
│   │   │   └── confidence-calculation.test.ts
│   │   ├── email-processing/
│   │   │   ├── metadata-extractor.test.ts
│   │   │   ├── traceability-generator.test.ts
│   │   │   └── duplicate-detector.test.ts
│   │   ├── llm/
│   │   │   ├── output-validator.test.ts   # Zod schema validation
│   │   │   └── confidence-calculator.test.ts
│   │   └── rules/
│   │       └── engine.test.ts
│   │
│   ├── integration/              # 40% - Cross-module interaction tests
│   │   ├── database/
│   │   │   ├── schema.test.ts         # Schema validation tests
│   │   │   ├── migrations.test.ts     # Migration tests
│   │   │   ├── repositories.test.ts   # Repository layer tests
│   │   │   └── foreign-keys.test.ts   # Referential integrity tests
│   │   ├── ipc/
│   │   │   └── channels.test.ts       # IPC communication tests
│   │   ├── llm/
│   │   │   ├── adapter-factory.test.ts
│   │   │   └── mode-switching.test.ts # Hot mode switch queue tests
│   │   ├── security/
│   │   │   ├── quickjs-sandbox.test.ts    # Sandbox escape tests (20+ scenarios)
│   │   │   └── single-instance.test.ts    # Process lock tests
│   │   └── email-processing/
│   │       └── parsers/                # Email parser integration tests
│   │
│   └── fixtures/                  # Test data and mocks
│       ├── emails/                   # Sample email files (.eml, .msg, .pst, etc.)
│       └── mocks/                   # Mock services and responses
│
├── electron/                     # Electron build configuration
│   ├── main.js                    # Main process entry point
│   └── preload.js                 # Preload script (contextBridge)
│
├── docs/
│   ├── DESIGN_SYSTEM.md           # UI/UX design guidelines
│   └── tech-architecture.md       # This technical architecture document
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── vitest.config.ts
```

**Structure Decision**: Electron desktop application with main/renderer process separation. Main process handles security, database, LLM integration, and business logic. Renderer process (React) displays UI and communicates via IPC whitelist. Shared types module ensures type safety across process boundaries. This architecture enforces security boundaries through process isolation while maintaining type safety through TypeScript.

## Complexity Tracking

> **No constitutional violations requiring justification**

This implementation plan fully satisfies all constitutional requirements without deviations. The design choices align with the core principles of privacy-first architecture, anti-hallucination mechanisms, data minimization, and comprehensive testing.

## Implementation Phases

### Phase 0: Research & Technology Validation ✅ (COMPLETED)

**Objective**: Validate technology choices and resolve all NEEDS CLARIFICATION items from Technical Context.

**Deliverables**: [research.md](./research.md)

**Key Decisions**:
- **Frontend Stack**: Tailwind CSS v3.4 + shadcn/ui + Lucide React + Inter font for modern, accessible UI
- **Database**: better-sqlite3 11.10.0 with field-level AES-256-GCM encryption, WAL mode
- **Email Parsing**: imapflow + mailparser for standard formats, @kenjiuno/msgreader/pst-extractor for Outlook formats
- **LLM Integration**: Local (Ollama/LocalAI) and remote (third-party API) with unified adapter interface
- **Validation**: Zod Schema for runtime type validation with automatic retry (max 2x) on failure
- **Rule Engine**: QuickJS WASM sandbox with 128MB memory limit, 5s timeout, zero permissions
- **State Management**: Zustand 4.5 for React state with in-memory encryption for sensitive data
- **Testing**: Vitest + custom integration framework, ≥85% line coverage, 100% for security modules

### Phase 1: Design & Contract Specification ✅ (COMPLETED)

**Prerequisites**: research.md complete, all technical decisions validated

**Deliverables**:
- [data-model.md](./data-model.md) - Complete database schema with relationships
- [quickstart.md](./quickstart.md) - Developer onboarding guide
- [contracts/](./contracts/) - API contracts and schemas

**Data Model Highlights**:
- `app_metadata` - Schema version, install time, device fingerprint
- `user_config` - Encrypted configuration storage
- `daily_reports` - Main report table with encrypted content
- `todo_items` - Action items with source_status, confidence_score, feedback_type (integrated feedback)
- `item_email_refs` - Many-to-many relationship (anti-hallucination core)
- `processed_emails` - Email metadata with search_string and file_path
- `app_logs` - Structured logging for troubleshooting

**Key Design Decisions**:
- Field-level encryption (not file-level) for selective data protection
- Many-to-many email-item relationships for complete traceability
- Feedback integrated into todo_items table (removed separate feedback database)
- Automatic triggers for report statistics maintenance
- CASCADE delete for referential integrity

### Phase 2: Implementation Planning (NEXT)

**Objective**: Generate actionable, dependency-ordered implementation tasks

**Prerequisites**: Phase 1 artifacts complete, constitution check passed

**Deliverables**: [tasks.md](./tasks.md) - Generated by `/speckit.tasks` command

**Task Categories**:
1. **Foundation** - Project setup, build tooling, TypeScript configuration
2. **Security Core** - Encryption, key management, sandbox, network interceptor
3. **Database Layer** - Schema, migrations, repositories, cleanup
4. **Email Processing** - Parsers, metadata extraction, traceability, duplicate detection
5. **LLM Integration** - Adapters, validation, confidence calculation
6. **Rules Engine** - QuickJS sandbox, rule execution, default rules
7. **Report Generation** - Report builder, template engine, export
8. **Frontend UI** - React components, state management, IPC client
9. **Testing** - Unit tests, integration tests, security tests
10. **Documentation** - Inline docs, user guides, architecture diagrams

**Implementation Order**:
1. Security Core (foundation for all other modules)
2. Database Layer (persistence for emails, items, reports)
3. Email Processing (data extraction pipeline)
4. Rules Engine (lightweight extraction fallback)
5. LLM Integration (heavyweight extraction)
6. Report Generation (user-facing output)
7. Frontend UI (user interface)
8. Testing (parallel with development)

## Success Criteria

### Measurable Outcomes

**Traceability & Verification**:
- SC-001: 100% of action items contain Message-ID or SHA-256 fingerprint
- SC-002: 100% display complete source metadata (sender, date, subject, file path, search string)
- SC-003: 90% of users locate original email within 60s using search string
- SC-004: Message-ID extraction meets format-specific targets (.eml ≥95%, .msg ≥85%, .pst ≥90%)

**Performance**:
- SC-014: Email metadata extraction ≤100ms per email
- SC-015: Local LLM processing ≤2s per email
- SC-016: App startup ≤3s with 1000 historical reports
- SC-017: 1000-report query <100ms

**Privacy & Security**:
- SC-011: 100% of users locate and use feedback deletion controls
- SC-012: Zero network transmissions for feedback operations
- SC-013: All feedback data encrypted at rest (AES-256-GCM)

**Feature Completeness**:
- SC-018: All P1 user stories (US1-US3) implemented and tested
- SC-019: All P2 user stories (US4-US6) implemented and tested
- SC-020: All FR-001 through FR-061 passing automated tests
- SC-025: 100% constitutional requirements satisfied

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| QuickJS WASM compatibility issues | High | Medium | Extensive integration testing, fallback to isolated Node.js context |
| Outlook format parsing failures | Medium | High | Clear user communication, degraded confidence caps, multiple library options (@kenjiuno/msgreader/pst-extractor) |
| Local LLM performance degradation | Medium | Medium | Progress indicators, batch size limits, timeout enforcement |
| Encryption key loss scenarios | High | Low | Clear user warnings, export functionality, device binding disclosure |
| Mode switching race conditions | High | Low | State flag management, queue implementation, comprehensive testing |
| Email client search string incompatibility | Low | Medium | Standard format, user documentation, format examples in UI |

## Next Steps

1. ✅ **Phase 0 Complete**: Research and technology validation done
2. ✅ **Phase 1 Complete**: Data model and contracts finalized
3. ⏭️ **Phase 2 Next**: Execute `/speckit.tasks` to generate implementation tasks
4. 🔜 **Implementation**: Begin task execution following dependency order
5. 🔜 **Testing**: Continuous testing during development (test-first approach)
6. 🔜 **Documentation**: Update architecture docs as implementation evolves

---

**Plan Version**: 2.7 | **Last Updated**: 2026-02-05 | **Status**: Ready for Phase 2 (Task Generation)
