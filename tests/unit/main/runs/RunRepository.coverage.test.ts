import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigManager } from '@/config/ConfigManager';
import DatabaseManager from '@/database/Database';
import RunRepository from '@/runs/RunRepository';
import type { PersistedRunDetail } from '@/runs/runTypes';

type ExtractionRunRow = {
  run_id: string;
  started_at: number;
  finished_at: number | null;
  status: PersistedRunDetail['status'];
  pst_count: number;
  processed_email_count: number;
  item_count: number;
  low_confidence_count: number;
  outlook_directory: string;
  message: string;
  error_message: string | null;
};

type PstRow = {
  pst_id: string;
  run_id: string;
  absolute_path: string;
  file_name: string;
  file_size_bytes: number;
  modified_at: number;
  readability: 'readable' | 'unreadable';
  readability_reason: string | null;
};

type EmailRow = {
  email_id: string;
  run_id: string;
  pst_id: string | null;
  message_identifier: string | null;
  fingerprint: string;
  sender_display: string;
  sender_address: string | null;
  subject: string;
  sent_at: number | null;
  file_path_hint: string;
};

type ItemRow = {
  item_id: string;
  run_id: string;
  title: string;
  content: string;
  item_type: 'todo' | 'completed';
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  source_status: 'verified' | 'unverified';
  rationale: string;
  sender_display: string;
  sent_at: number | null;
  subject_snippet: string;
};

type EvidenceRow = {
  evidence_id: string;
  item_id: string;
  email_id: string | null;
  sender_display: string;
  subject_snippet: string;
  sent_at: number | null;
  search_term: string;
  file_path: string;
  source_identifier: string;
};

class FakeDatabase {
  extractionRuns: ExtractionRunRow[] = [];
  pstFiles: PstRow[] = [];
  processedEmails: EmailRow[] = [];
  actionItems: ItemRow[] = [];
  itemEvidence: EvidenceRow[] = [];

  exec(_sql: string): void {}

  transaction<T>(fn: (db: FakeDatabase) => T) {
    return () => fn(this);
  }

  prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized === 'DELETE FROM extraction_runs WHERE run_id = ?') {
      return {
        run: (runId: string) => {
          this.extractionRuns = this.extractionRuns.filter((row) => row.run_id !== runId);
          const itemIds = this.actionItems.filter((row) => row.run_id === runId).map((row) => row.item_id);
          this.pstFiles = this.pstFiles.filter((row) => row.run_id !== runId);
          this.processedEmails = this.processedEmails.filter((row) => row.run_id !== runId);
          this.actionItems = this.actionItems.filter((row) => row.run_id !== runId);
          this.itemEvidence = this.itemEvidence.filter((row) => !itemIds.includes(row.item_id));
        },
      };
    }

    if (normalized === 'SELECT COUNT(*) AS count FROM extraction_runs') {
      return {
        get: () => ({ count: this.extractionRuns.length }),
      };
    }

    if (normalized === 'DELETE FROM item_evidence') {
      return {
        run: () => {
          this.itemEvidence = [];
        },
      };
    }

    if (normalized === 'DELETE FROM action_items') {
      return {
        run: () => {
          this.actionItems = [];
        },
      };
    }

    if (normalized === 'DELETE FROM processed_emails') {
      return {
        run: () => {
          this.processedEmails = [];
        },
      };
    }

    if (normalized === 'DELETE FROM discovered_pst_files') {
      return {
        run: () => {
          this.pstFiles = [];
        },
      };
    }

    if (normalized === 'DELETE FROM extraction_runs') {
      return {
        run: () => {
          this.extractionRuns = [];
        },
      };
    }

    if (normalized.startsWith('INSERT INTO extraction_runs')) {
      return {
        run: (...args: unknown[]) => {
          this.extractionRuns.push({
            run_id: args[0] as string,
            started_at: args[1] as number,
            finished_at: args[2] as number | null,
            status: args[3] as ExtractionRunRow['status'],
            pst_count: args[4] as number,
            processed_email_count: args[5] as number,
            item_count: args[6] as number,
            low_confidence_count: args[7] as number,
            outlook_directory: args[8] as string,
            message: args[9] as string,
            error_message: (args[10] as string | null) ?? null,
          });
        },
      };
    }

    if (normalized.startsWith('INSERT INTO discovered_pst_files')) {
      return {
        run: (...args: unknown[]) => {
          this.pstFiles.push({
            pst_id: args[0] as string,
            run_id: args[1] as string,
            absolute_path: args[2] as string,
            file_name: args[3] as string,
            file_size_bytes: args[4] as number,
            modified_at: args[5] as number,
            readability: args[6] as PstRow['readability'],
            readability_reason: (args[7] as string | null) ?? null,
          });
        },
      };
    }

    if (normalized.startsWith('INSERT INTO processed_emails')) {
      return {
        run: (...args: unknown[]) => {
          this.processedEmails.push({
            email_id: args[0] as string,
            run_id: args[1] as string,
            pst_id: (args[2] as string | null) ?? null,
            message_identifier: (args[3] as string | null) ?? null,
            fingerprint: args[4] as string,
            sender_display: args[5] as string,
            sender_address: (args[6] as string | null) ?? null,
            subject: args[7] as string,
            sent_at: (args[8] as number | null) ?? null,
            file_path_hint: args[9] as string,
          });
        },
      };
    }

    if (normalized.startsWith('INSERT INTO action_items')) {
      return {
        run: (...args: unknown[]) => {
          this.actionItems.push({
            item_id: args[0] as string,
            run_id: args[1] as string,
            title: args[2] as string,
            content: args[3] as string,
            item_type: args[4] as ItemRow['item_type'],
            confidence_score: args[5] as number,
            confidence_level: args[6] as ItemRow['confidence_level'],
            source_status: args[7] as ItemRow['source_status'],
            rationale: args[8] as string,
            sender_display: args[9] as string,
            sent_at: (args[10] as number | null) ?? null,
            subject_snippet: args[11] as string,
          });
        },
      };
    }

    if (normalized.startsWith('INSERT INTO item_evidence')) {
      return {
        run: (...args: unknown[]) => {
          this.itemEvidence.push({
            evidence_id: args[0] as string,
            item_id: args[1] as string,
            email_id: (args[2] as string | null) ?? null,
            sender_display: args[3] as string,
            subject_snippet: args[4] as string,
            sent_at: (args[5] as number | null) ?? null,
            search_term: args[6] as string,
            file_path: args[7] as string,
            source_identifier: args[8] as string,
          });
        },
      };
    }

    if (normalized === 'SELECT run_id FROM extraction_runs ORDER BY started_at DESC LIMIT 1') {
      return {
        get: () => {
          const latest = [...this.extractionRuns].sort((left, right) => right.started_at - left.started_at)[0];
          return latest ? { run_id: latest.run_id } : undefined;
        },
      };
    }

    if (normalized.includes('FROM extraction_runs WHERE run_id = ?')) {
      return {
        get: (runId: string) => this.extractionRuns.find((row) => row.run_id === runId),
      };
    }

    if (normalized.includes('FROM discovered_pst_files WHERE run_id = ?')) {
      return {
        all: (runId: string) =>
          this.pstFiles
            .filter((row) => row.run_id === runId)
            .sort((left, right) => left.file_name.localeCompare(right.file_name))
            .map((row) => ({
              absolute_path: row.absolute_path,
              file_name: row.file_name,
              file_size_bytes: row.file_size_bytes,
              modified_at: row.modified_at,
              readability: row.readability,
              readability_reason: row.readability_reason,
            })),
      };
    }

    if (normalized.includes('FROM item_evidence WHERE item_id IN')) {
      return {
        all: (runId: string) => {
          const itemIds = this.actionItems.filter((row) => row.run_id === runId).map((row) => row.item_id);
          return this.itemEvidence
            .filter((row) => itemIds.includes(row.item_id))
            .sort(
              (left, right) =>
                left.item_id.localeCompare(right.item_id) || left.evidence_id.localeCompare(right.evidence_id)
            )
            .map((row) => ({
              evidence_id: row.evidence_id,
              item_id: row.item_id,
              sender_display: row.sender_display,
              subject_snippet: row.subject_snippet,
              sent_at: row.sent_at,
              search_term: row.search_term,
              file_path: row.file_path,
              source_identifier: row.source_identifier,
            }));
        },
      };
    }

    if (normalized.includes('FROM action_items WHERE run_id = ?')) {
      return {
        all: (runId: string) =>
          this.actionItems
            .filter((row) => row.run_id === runId)
            .sort((left, right) => (right.sent_at ?? 0) - (left.sent_at ?? 0))
            .map((row) => ({
              item_id: row.item_id,
              title: row.title,
              content: row.content,
              item_type: row.item_type,
              confidence_score: row.confidence_score,
              confidence_level: row.confidence_level,
              source_status: row.source_status,
              rationale: row.rationale,
              sender_display: row.sender_display,
              sent_at: row.sent_at,
              subject_snippet: row.subject_snippet,
            })),
      };
    }

    if (normalized.includes('FROM extraction_runs ORDER BY started_at DESC LIMIT ?')) {
      return {
        all: (limit: number) =>
          [...this.extractionRuns]
            .sort((left, right) => right.started_at - left.started_at)
            .slice(0, limit)
            .map((row) => ({
              run_id: row.run_id,
              started_at: row.started_at,
              finished_at: row.finished_at,
              status: row.status,
              pst_count: row.pst_count,
              processed_email_count: row.processed_email_count,
              item_count: row.item_count,
              low_confidence_count: row.low_confidence_count,
            })),
      };
    }

    throw new Error(`Unexpected SQL in fake database: ${normalized}`);
  }
}

function resetRunRepositorySchema(): void {
  (RunRepository as unknown as { schemaReady: boolean }).schemaReady = false;
}

function createRunFixture(overrides: Partial<PersistedRunDetail> = {}): PersistedRunDetail {
  const emailId = overrides.processedEmails?.[0]?.emailId ?? 'email-1';
  const base: PersistedRunDetail = {
    runId: 'run-1',
    startedAt: 1710000000000,
    finishedAt: 1710000060000,
    status: 'completed',
    pstCount: 1,
    processedEmailCount: 1,
    itemCount: 1,
    lowConfidenceCount: 0,
    outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
    message: '鎵弿瀹屾垚锛屽鐞?1 灏侀偖浠讹紝鎻愬彇 1 鏉′簨椤广€?',
    errorMessage: null,
    pstFiles: [
      {
        path: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
        fileName: 'mailbox.pst',
        sizeBytes: 1024,
        modifiedAt: 1710000000000,
        readability: 'readable',
        reason: null,
      },
    ],
    processedEmails: [
      {
        emailId,
        pstPath: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
        messageIdentifier: 'message-1@example.com',
        fingerprint: 'fingerprint-1',
        senderDisplay: 'Alice',
        senderAddress: 'alice@example.com',
        subject: '璇风‘璁ゅ彂甯冨畨鎺?',
        sentAt: 1710000020000,
        filePathHint: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
      },
    ],
    items: [
      {
        itemId: 'item-1',
        title: '纭鍙戝竷瀹夋帓',
        content: '璇峰湪浠婂ぉ涓嬬彮鍓嶇‘璁ゅ彂甯冨畨鎺掑苟鍥炲娴嬭瘯缁撴灉銆?',
        itemType: 'todo',
        confidenceScore: 0.88,
        confidenceLevel: 'high',
        sourceStatus: 'verified',
        rationale: 'Detected explicit action language in the email body.',
        senderDisplay: 'Alice',
        sentAt: 1710000020000,
        subjectSnippet: '璇风‘璁ゅ彂甯冨畨鎺?',
        evidence: [
          {
            evidenceId: 'evidence-1',
            emailId,
            senderDisplay: 'Alice',
            subjectSnippet: '璇风‘璁ゅ彂甯冨畨鎺?',
            sentAt: 1710000020000,
            searchTerm: '纭鍙戝竷瀹夋帓',
            filePath: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
            sourceIdentifier: 'message-1@example.com',
          },
        ],
      },
    ],
  };

  return {
    ...base,
    ...overrides,
    pstFiles: overrides.pstFiles ?? base.pstFiles,
    processedEmails: overrides.processedEmails ?? base.processedEmails,
    items: overrides.items ?? base.items,
  };
}

describe('RunRepository coverage', () => {
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();
    DatabaseManager.setInstanceForTesting(db as never);
    resetRunRepositorySchema();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    DatabaseManager.resetInstanceForTesting();
    resetRunRepositorySchema();
  });

  it('returns null when there is no persisted run', async () => {
    expect(await RunRepository.getLatest()).toBeNull();
    expect(await RunRepository.getById('missing-run')).toBeNull();
  });

  it('clears persisted runs and reports the number of deleted records', async () => {
    await RunRepository.saveRun(createRunFixture());
    await RunRepository.saveRun(
      createRunFixture({
        runId: 'run-2',
        startedAt: 1710000100000,
        processedEmails: [
          {
            emailId: 'email-2',
            pstPath: 'C:\\Users\\User\\Documents\\Outlook Files\\second.pst',
            messageIdentifier: 'message-2@example.com',
            fingerprint: 'fingerprint-2',
            senderDisplay: 'Bob',
            senderAddress: 'bob@example.com',
            subject: 'Follow up',
            sentAt: 1710000120000,
            filePathHint: 'C:\\Users\\User\\Documents\\Outlook Files\\second.pst',
          },
        ],
        pstFiles: [
          {
            path: 'C:\\Users\\User\\Documents\\Outlook Files\\second.pst',
            fileName: 'second.pst',
            sizeBytes: 2048,
            modifiedAt: 1710000100000,
            readability: 'readable',
            reason: null,
          },
        ],
        items: [
          {
            itemId: 'item-2',
            title: 'Follow up',
            content: 'Please follow up with the vendor.',
            itemType: 'todo',
            confidenceScore: 0.62,
            confidenceLevel: 'medium',
            sourceStatus: 'verified',
            rationale: 'Detected follow-up language.',
            senderDisplay: 'Bob',
            sentAt: 1710000120000,
            subjectSnippet: 'Follow up',
            evidence: [],
          },
        ],
      })
    );

    const deletedCount = await RunRepository.clearRuns();

    expect(deletedCount).toBe(2);
    expect(db.extractionRuns).toHaveLength(0);
    expect(db.pstFiles).toHaveLength(0);
    expect(db.processedEmails).toHaveLength(0);
    expect(db.actionItems).toHaveLength(0);
    expect(db.itemEvidence).toHaveLength(0);
  });

  it('lists recent runs in descending order and respects the requested limit', async () => {
    await RunRepository.saveRun(createRunFixture());
    await RunRepository.saveRun(
      createRunFixture({
        runId: 'run-2',
        startedAt: 1710000100000,
        finishedAt: 1710000160000,
      })
    );

    const recentRuns = await RunRepository.listRecent(1);

    expect(recentRuns).toEqual([
      expect.objectContaining({
        runId: 'run-2',
        startedAt: 1710000100000,
      }),
    ]);
  });

  it('hydrates empty evidence lists and null PST bindings when related source rows are missing', async () => {
    const run = createRunFixture({
      runId: 'run-unmatched',
      pstCount: 0,
      pstFiles: [],
      processedEmails: [
        {
          emailId: 'email-orphan',
          pstPath: 'C:\\Users\\User\\Documents\\Outlook Files\\orphan.pst',
          messageIdentifier: null,
          fingerprint: 'fingerprint-orphan',
          senderDisplay: 'Alice',
          senderAddress: 'alice@example.com',
          subject: 'Please review',
          sentAt: 1710000020000,
          filePathHint: 'C:\\Users\\User\\Documents\\Outlook Files\\orphan.pst',
        },
      ],
      items: [
        {
          itemId: 'item-orphan',
          title: 'Please review',
          content: 'Please review the document.',
          itemType: 'todo',
          confidenceScore: 0.62,
          confidenceLevel: 'medium',
          sourceStatus: 'verified',
          rationale: 'Detected review language.',
          senderDisplay: 'Alice',
          sentAt: 1710000020000,
          subjectSnippet: 'Please review',
          evidence: [],
        },
      ],
    });

    await RunRepository.saveRun(run);
    const detail = await RunRepository.getById('run-unmatched');

    expect(db.processedEmails[0]?.pst_id).toBeNull();
    expect(detail).toEqual(
      expect.objectContaining({
        runId: 'run-unmatched',
        items: [
          expect.objectContaining({
            itemId: 'item-orphan',
            evidence: [],
          }),
        ],
      })
    );
  });

  it('creates empty pending runs for both discovered and missing PST states', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1710000200000);

    const pendingWithFiles = await RunRepository.createEmptyRun(
      [
        {
          path: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
          fileName: 'mailbox.pst',
          sizeBytes: 1024,
          modifiedAt: 1710000000000,
          readability: 'readable',
          reason: null,
        },
        {
          path: 'C:\\Users\\User\\Documents\\Outlook Files\\blocked.pst',
          fileName: 'blocked.pst',
          sizeBytes: 1024,
          modifiedAt: 1710000000000,
          readability: 'unreadable',
          reason: 'Access denied',
        },
      ],
      'C:\\Users\\User\\Documents\\Outlook Files'
    );
    const pendingWithoutFiles = await RunRepository.createEmptyRun([], 'C:\\Users\\User\\Documents\\Outlook Files');

    expect(pendingWithFiles).toEqual(
      expect.objectContaining({
        startedAt: 1710000200000,
        status: 'pending',
        pstCount: 1,
        items: [],
      })
    );
    expect(pendingWithFiles.message).not.toBe(pendingWithoutFiles.message);
    expect(pendingWithoutFiles.pstCount).toBe(0);
  });

  it('returns settings seed values and falls back to empty strings for non-string config entries', async () => {
    vi.spyOn(ConfigManager, 'get').mockResolvedValue({
      'outlook.directory': 'C:\\Users\\User\\Documents\\Outlook Files',
      'ai.baseUrl': 123,
      'ai.model': 'gpt-4.1-mini',
    });

    const settings = await RunRepository.getSettingsSeed();

    expect(settings).toEqual({
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      aiBaseUrl: '',
      aiModel: 'gpt-4.1-mini',
    });
  });
});
