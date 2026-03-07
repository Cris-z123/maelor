# Foundational Infrastructure Design: T010-T012

**Date**: 2026-03-06
**Feature**: 002-user-interaction-system
**Tasks**: T010 (FTS5 Migration), T011 (OnboardingManager), T012 (EmailClientDetector)
**Approach**: Modular Isolation Implementation (方案1)

---

## Overview

Implement foundational infrastructure components for the user interaction system using a modular, dependency-driven approach. These components form the backbone for User Story 1 (First-Time Setup) and User Story 5 (Historical Search).

**Implementation Order**:
1. T012: EmailClientDetector (independent utility)
2. T011: OnboardingManager (depends on T012)
3. T010: FTS5 Migration (database layer, independent)

**Test Strategy**: Red-Green-Refactor per module

---

## Part 1: T012 EmailClientDetector

### Architecture

**File Location**: `src/main/onboarding/EmailClientDetector.ts`

**Class Structure**:
```typescript
class EmailClientDetector {
  private static readonly PLATFORM_DEFAULTS: Record<PlatformType, EmailClient[]>

  static detectEmailClient(clientType: ClientType): DetectedPath | null
  static validatePath(path: string): ValidationResult

  private static checkDefaultPaths(clientType: EmailClient): string | null
  private static checkWindowsRegistry(clientType: EmailClient): string | null
  private static checkMacOSPlist(clientType: EmailClient): string | null
  private static hasEmailFiles(path: string): boolean
}
```

### Platform Detection Strategy

**Windows (win32)**:
- Thunderbird: `%LOCALAPPDATA%\Mozilla Thunderbird`, `C:\Program Files\Mozilla Thunderbird\`
- Outlook: `C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE`
- Detection: Filesystem + Registry query (`HKEY_CURRENT_USER\Software`)

**macOS (darwin)**:
- Thunderbird: `/Applications/Thunderbird.app`
- Apple Mail: `/System/Library/Frameworks/Email.framework`
- Detection: Path existence check

**Linux**:
- Thunderbird: `/usr/bin/thunderbird`, `/usr/lib/thunderbird`
- Detection: `which` command + path check

### Validation Logic

Path validation checks:
1. Path exists (`fs.existsSync()`)
2. Is directory (`fs.statSync().isDirectory()`)
3. Contains email files (`.msf`, `.mbox`, `.pst` files)

### Error Handling

- Detection fails: Return `null`, message "未检测到，请手动选择"
- Invalid path: Throw `Error("路径无效或未找到邮件文件")`
- Permission error: Catch and return friendly message

### Testing Coverage

Unit tests:
- Windows path detection (mock registry)
- macOS path detection (mock plist)
- Linux path detection (mock fs)
- Path validation (valid/invalid/no email files)
- Edge cases (empty path, special characters)

---

## Part 2: T011 OnboardingManager

### Architecture

**File Location**: `src/main/onboarding/OnboardingManager.ts`

**Class Structure**:
```typescript
class OnboardingManager {
  private db: Database.Database
  private detector: EmailClientDetector

  constructor(db: Database.Database)

  // State management
  getStatus(): OnboardingState
  setStep(step: 1 | 2 | 3): void
  isCompleted(): boolean

  // Step 1: Email client configuration
  setEmailClient(config: EmailClientConfig): Promise<ValidationResult>
  detectEmailClient(type: ClientType): Promise<DetectedPath | null>
  validateEmailPath(path: string): Promise<ValidationResult>

  // Step 2: Schedule settings
  setSchedule(config: ScheduleConfig): Promise<void>

  // Step 3: LLM configuration
  setLLMConfig(config: LLMConfig): Promise<void>
  testLLMConnection(config: LLMConfig): Promise<ConnectionTestResult>

  // Complete onboarding
  completeOnboarding(): Promise<void>

  // Internal methods
  private saveConfig(key: string, value: any): Promise<void>
  private loadConfig(key: string): Promise<any>
}
```

### Data Model

**OnboardingState** (stored in `user_config` table, key='onboarding'):
```typescript
{
  completed: boolean
  currentStep: 1 | 2 | 3
  emailClient: {
    type: 'thunderbird' | 'outlook' | 'apple-mail'
    path: string
    detectedPath: string | null
    validated: boolean
  }
  schedule: {
    generationTime: { hour: number, minute: number }
    skipWeekends: boolean
  }
  llm: {
    mode: 'local' | 'remote'
    localEndpoint: string
    remoteEndpoint: string
    apiKey: string
    connectionStatus: 'untested' | 'success' | 'failed'
  }
  lastUpdated: number
}
```

### Step Validation Logic

**Step 1 → Step 2**:
- Required: Email path validated (`emailClient.validated === true`)

**Step 2 → Step 3**:
- No validation required (can skip)

**Step 3 → Complete**:
- Required: LLM connection test successful (`llm.connectionStatus === 'success'`)

### Data Flow

```
First Launch → OnboardingManager.getStatus()
  → completed=false, currentStep=1
    → User configures email client
      → detector.detectEmailClient()
      → validator.validatePath()
      → Save to user_config (encrypted)
        → User completes Step 1
          → setStep(2)
            → ... repeat for Steps 2, 3
              → testLLMConnection() success
                → completeOnboarding()
                  → completed=true
```

### Module Interactions

**Dependencies**:
- `EmailClientDetector`: Detect default email client paths
- `Database.user_config`: Persist configuration (encrypted)
- `ConnectionTester`: Test LLM connection (future T028)

**Encryption Strategy**:
- Use `ConfigManager.encryptField()` for sensitive fields
- `apiKey` must be encrypted
- Other configs optionally encrypted

### Error Handling

- Save failure: Throw `OnboardingError("配置保存失败")`
- Encryption failure: Throw `EncryptionError("配置加密失败")`
- Validation failure: Return `ValidationResult {valid: false, message: string}`

### Testing Coverage

Unit tests:
- State save/load (mock database)
- Step validation logic (boundary testing)
- Encryption/decryption integration (mock ConfigManager)
- Complete onboarding flow (integration test)

Integration tests:
- Integration with EmailClientDetector
- Integration with Database
- IPC handler integration (future T027)

---

## Part 3: T010 FTS5 Full-Text Search Migration

### Architecture

**File Location**: `src/main/database/migrations/004-add-fts5-search.sql`

**Migration Content**:
```sql
-- 1. Create FTS5 virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS todo_items_fts USING fts5(
  item_id UNINDEXED,
  content,
  tags,
  evidence_text,
  content='todo_items',
  content_rowid='rowid'
);

-- 2. Insert existing data into FTS table
INSERT INTO todo_items_fts(rowid, item_id, content, tags, evidence_text)
SELECT
  ti.rowid,
  ti.item_id,
  json_extract(ti.content_encrypted, '$') as content,
  ti.tags,
  (SELECT GROUP_JOIN(ier.evidence_text, ' ')
   FROM item_email_refs ier
   WHERE ier.item_id = ti.item_id) as evidence_text
FROM todo_items ti
WHERE ti.content_encrypted IS NOT NULL;

-- 3. Create auto-sync triggers
CREATE TRIGGER IF NOT EXISTS todo_items_ai AFTER INSERT ON todo_items BEGIN
  INSERT INTO todo_items_fts(rowid, item_id, content, tags, evidence_text)
  VALUES (new.rowid, new.item_id, json_extract(new.content_encrypted, '$'), new.tags,
    (SELECT GROUP_JOIN(ier.evidence_text, ' ')
     FROM item_email_refs ier
     WHERE ier.item_id = new.item_id));
END;

CREATE TRIGGER IF NOT EXISTS todo_items_ad AFTER DELETE ON todo_items BEGIN
  DELETE FROM todo_items_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS todo_items_au AFTER UPDATE OF content_encrypted, tags ON todo_items BEGIN
  UPDATE todo_items_fts
  SET content = json_extract(new.content_encrypted, '$'),
      tags = new.tags,
      evidence_text = (SELECT GROUP_JOIN(ier.evidence_text, ' ')
                      FROM item_email_refs ier
                      WHERE ier.item_id = new.item_id)
  WHERE rowid = new.rowid;
END;

-- 4. Create performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_items_fts_content ON todo_items_fts(content);
CREATE INDEX IF NOT EXISTS idx_items_fts_tags ON todo_items_fts(tags);

-- 5. Update schema version
UPDATE app_metadata SET value = '2.7' WHERE key = 'schema_version';
```

### FTS5 Table Structure

**Why UNINDEXED item_id**:
- `item_id` used for exact match, doesn't need full-text index
- Reduces index size, improves performance

**Indexed Fields**:
- `content`: JSON string (title, description, etc.)
- `tags`: Tag array
- `evidence_text`: Source email evidence text

**External Content Table**:
- `content='todo_items'`: FTS table maps to main table
- `content_rowid='rowid'`: Use rowid for association

### Trigger Mechanism

**INSERT Trigger**:
- When new todo_item added, extract content and tags
- Associate with item_email_refs to get evidence_text
- Insert into FTS table

**UPDATE Trigger**:
- When content_encrypted or tags updated
- Sync to FTS table corresponding fields

**DELETE Trigger**:
- When todo_item deleted, auto-remove from FTS table

### Search Query Examples

```sql
-- Simple keyword search
SELECT ti.*, fts.rank
FROM todo_items_fts fts
JOIN todo_items ti ON ti.rowid = fts.rowid
WHERE todo_items_fts MATCH '王总监 预算'
ORDER BY fts.rank
LIMIT 20;

-- Boolean search
WHERE todo_items_fts MATCH '"王总监" AND "预算"'
WHERE todo_items_fts MATCH '"王总监" OR "预算"'
WHERE todo_items_fts MATCH '"王总监" NOT "预算"'

-- Phrase search
WHERE todo_items_fts MATCH '"王总监 预算审批"'
```

### Performance Optimization

**BM25 Ranking**:
- FTS5 auto-calculates relevance score
- `ORDER BY rank` returns most relevant results

**Pagination**:
- `LIMIT 20 OFFSET ?` implements pagination
- 20 items per page (matches SC-011: <1s search for 10k items)

**Data Volume Handling**:
- 10,000 items: Query time < 1 second
- 100,000 items: Query time < 2 seconds

### Migration Considerations

**Backward Compatibility**:
- Use `IF NOT EXISTS` to avoid duplicate creation
- Existing data auto-synced to FTS table

**Data Integrity**:
- Triggers ensure FTS table always synced with main table
- Auto-cleanup FTS table when main table record deleted

**Rollback Strategy**:
- Keep schema_version record
- Can identify migration state via version number

### Testing Strategy

**Manual Testing (Migration SQL)**:
1. Execute migration script
2. Verify FTS table creation: `SELECT * FROM todo_items_fts LIMIT 1`
3. Test triggers: INSERT/UPDATE/DELETE todo_items, check FTS table sync
4. Performance test: Search 10k items, verify <1s response

**Integration Testing (SearchManager, future T087)**:
- Test search query correctness
- Test BM25 ranking
- Test pagination functionality

---

## Implementation Plan

### Phase 1: T012 EmailClientDetector
1. Write failing tests (Red)
2. Implement EmailClientDetector class (Green)
3. Refactor and optimize (Refactor)

### Phase 2: T011 OnboardingManager
1. Write failing tests (Red)
2. Implement OnboardingManager class (Green)
3. Refactor and optimize (Refactor)

### Phase 3: T010 FTS5 Migration
1. Write migration script (manual verification)
2. Test migration execution
3. Verify triggers and performance

### Dependencies & Blocking

- T012: No dependencies, can start immediately
- T011: Depends on T012 completion
- T010: Independent, can run in parallel with T011/T012

### Success Criteria

- **T012**: All platforms detect default paths correctly, validation works
- **T011**: Complete onboarding flow testable, state persists across restarts
- **T010**: FTS5 search returns <1s for 10k items, triggers maintain sync

---

## Constitution Compliance

✅ **Privacy-First**: No cloud sync, all data local
✅ **Anti-Hallucination**: FTS5 supports source tracking
✅ **Data Minimization**: Metadata-only search, field-level encryption
✅ **Testing**: Unit + integration tests, ≥80% line coverage
✅ **Performance**: Search <1s for 10k items, meets SC-011

---

**Design Status**: ✅ Approved
**Next Step**: Invoke writing-plans skill to create detailed implementation plan
