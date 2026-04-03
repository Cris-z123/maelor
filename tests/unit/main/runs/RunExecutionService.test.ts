import { describe, expect, it, vi } from 'vitest';

import RunExecutionService from '@/runs/RunExecutionService';
import type { ParsedPstEmail, PersistedRunDetail } from '@/runs/runTypes';

function createParsedEmail(overrides: Partial<ParsedPstEmail> = {}): ParsedPstEmail {
  return {
    emailId: 'email-1',
    pstPath: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
    messageIdentifier: 'message-1@example.com',
    fingerprint: 'fingerprint-1',
    senderDisplay: 'Alice',
    senderAddress: 'alice@example.com',
    subject: '请确认发布安排',
    body: '请今天下班前确认发布安排并回复测试结果。',
    sentAt: 1710000020000,
    messageClass: 'IPM.Note',
    filePathHint: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
    ...overrides,
  };
}

describe('RunExecutionService', () => {
  it('builds a completed run with extracted items and evidence', async () => {
    const saveRun = vi.fn<(_: PersistedRunDetail) => Promise<void>>().mockResolvedValue(undefined);
    const service = new RunExecutionService({
      now: vi.fn().mockReturnValueOnce(1710000000000).mockReturnValueOnce(1710000060000),
      loadSettings: vi.fn().mockResolvedValue({
        outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
        aiBaseUrl: 'https://api.openai.com/v1',
        aiModel: 'gpt-4.1-mini',
      }),
      validateDirectory: vi.fn().mockReturnValue({
        valid: true,
        readablePstCount: 1,
        unreadablePstCount: 0,
        files: [
          {
            path: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
            fileName: 'mailbox.pst',
            sizeBytes: 1024,
            modifiedAt: 1710000000000,
            readability: 'readable',
            reason: null,
          },
        ],
        message: 'Found 1 readable PST file.',
      }),
      loadPstEmails: vi.fn().mockResolvedValue([createParsedEmail()]),
      saveRun,
    });

    const result = await service.start();

    expect(result.success).toBe(true);
    expect(result.runId).not.toBeNull();
    expect(result.message).toContain('扫描完成');
    expect(saveRun).toHaveBeenCalledOnce();
    expect(saveRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        processedEmailCount: 1,
        itemCount: 1,
        items: [
          expect.objectContaining({
            title: '请确认发布安排',
            evidence: [
              expect.objectContaining({
                emailId: 'email-1',
                sourceIdentifier: 'message-1@example.com',
              }),
            ],
          }),
        ],
      })
    );
  });

  it('rejects a second run while the first one is still in progress', async () => {
    let releaseFirstRun: (() => void) | undefined;

    const service = new RunExecutionService({
      loadSettings: vi.fn().mockResolvedValue({
        outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
        aiBaseUrl: 'https://api.openai.com/v1',
        aiModel: 'gpt-4.1-mini',
      }),
      validateDirectory: vi.fn().mockReturnValue({
        valid: true,
        readablePstCount: 1,
        unreadablePstCount: 0,
        files: [
          {
            path: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
            fileName: 'mailbox.pst',
            sizeBytes: 1024,
            modifiedAt: 1710000000000,
            readability: 'readable',
            reason: null,
          },
        ],
        message: 'Found 1 readable PST file.',
      }),
      loadPstEmails: vi.fn().mockImplementation(
        () =>
          new Promise<ParsedPstEmail[]>((resolve) => {
            releaseFirstRun = () => resolve([createParsedEmail()]);
          })
      ),
      saveRun: vi.fn().mockResolvedValue(undefined),
    });

    const firstRunPromise = service.start();
    const secondRun = await service.start();
    releaseFirstRun?.();
    await firstRunPromise;

    expect(secondRun).toEqual({
      success: false,
      runId: null,
      message: '已有扫描任务正在执行，请等待当前任务完成。',
    });
  });
});
