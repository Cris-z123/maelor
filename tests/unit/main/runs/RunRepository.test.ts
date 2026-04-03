import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import DatabaseManager from '@/database/Database';
import RunRepository from '@/runs/RunRepository';
import type { PersistedRunDetail } from '@/runs/runTypes';

const migrationSql = fs.readFileSync(
  path.resolve(process.cwd(), 'src/main/database/migrations/001_initial_schema.sql'),
  'utf8'
);

function resetRunRepositorySchema(): void {
  (RunRepository as unknown as { schemaReady: boolean }).schemaReady = false;
}

function createRunFixture(): PersistedRunDetail {
  const emailId = 'email-1';

  return {
    runId: 'run-1',
    startedAt: 1710000000000,
    finishedAt: 1710000060000,
    status: 'completed',
    pstCount: 1,
    processedEmailCount: 1,
    itemCount: 1,
    lowConfidenceCount: 0,
    outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
    message: '扫描完成，处理 1 封邮件，提取 1 条事项。',
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
        subject: '请确认发布安排',
        sentAt: 1710000020000,
        filePathHint: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
      },
    ],
    items: [
      {
        itemId: 'item-1',
        title: '确认发布安排',
        content: '请在今天下班前确认发布安排并回复测试结果。',
        itemType: 'todo',
        confidenceScore: 0.88,
        confidenceLevel: 'high',
        sourceStatus: 'verified',
        rationale: 'Detected explicit action language in the email body.',
        senderDisplay: 'Alice',
        sentAt: 1710000020000,
        subjectSnippet: '请确认发布安排',
        evidence: [
          {
            evidenceId: 'evidence-1',
            emailId,
            senderDisplay: 'Alice',
            subjectSnippet: '请确认发布安排',
            sentAt: 1710000020000,
            searchTerm: '确认发布安排',
            filePath: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
            sourceIdentifier: 'message-1@example.com',
          },
        ],
      },
    ],
  };
}

describe.skip('RunRepository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(migrationSql);
    DatabaseManager.setInstanceForTesting(db);
    resetRunRepositorySchema();
  });

  afterEach(() => {
    db.close();
    DatabaseManager.resetInstanceForTesting();
    resetRunRepositorySchema();
  });

  it('persists processed emails and binds evidence to the source email', async () => {
    const run = createRunFixture();

    await RunRepository.saveRun(run);

    const storedEvidence = db
      .prepare(
        `
          SELECT ie.email_id, pe.subject, pe.message_identifier
          FROM item_evidence ie
          LEFT JOIN processed_emails pe ON pe.email_id = ie.email_id
          WHERE ie.item_id = ?
        `
      )
      .get(run.items[0].itemId) as { email_id: string; subject: string; message_identifier: string };

    expect(storedEvidence).toEqual({
      email_id: 'email-1',
      subject: '请确认发布安排',
      message_identifier: 'message-1@example.com',
    });
  });

  it('hydrates the latest run detail with evidence for review rendering', async () => {
    const run = createRunFixture();

    await RunRepository.saveRun(run);

    const latest = await RunRepository.getLatest();

    expect(latest).toEqual({
      runId: 'run-1',
      startedAt: 1710000000000,
      finishedAt: 1710000060000,
      status: 'completed',
      pstCount: 1,
      processedEmailCount: 1,
      itemCount: 1,
      lowConfidenceCount: 0,
      outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
      message: '扫描完成，处理 1 封邮件，提取 1 条事项。',
      pstFiles: [
        expect.objectContaining({
          fileName: 'mailbox.pst',
          readability: 'readable',
        }),
      ],
      items: [
        expect.objectContaining({
          itemId: 'item-1',
          title: '确认发布安排',
          evidence: [
            expect.objectContaining({
              evidenceId: 'evidence-1',
              searchTerm: '确认发布安排',
              sourceIdentifier: 'message-1@example.com',
            }),
          ],
        }),
      ],
    });
  });
});
