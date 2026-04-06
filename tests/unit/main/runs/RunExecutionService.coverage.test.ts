import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('pst-extractor', () => ({
    PSTFile: vi.fn(),
}));

import { PSTFile } from 'pst-extractor';

import type { ValidationFile } from '@shared/types/app.js';

import RunExecutionService from '@/runs/RunExecutionService';
import type { ParsedPstEmail, PersistedRunDetail, RunExecutionDependencies } from '@/runs/runTypes';

const OUTLOOK_DIRECTORY = 'C:\\Users\\User\\Documents\\Outlook Files';
const IN_PROGRESS_MESSAGE = '宸叉湁鎵弿浠诲姟姝ｅ湪鎵ц锛岃绛夊緟褰撳墠浠诲姟瀹屾垚銆?';

function createValidationFile(overrides: Partial<ValidationFile> = {}): ValidationFile {
    return {
        path: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
        fileName: 'mailbox.pst',
        sizeBytes: 1024,
        modifiedAt: 1710000000000,
        readability: 'readable',
        reason: null,
        ...overrides,
    };
}

function createParsedEmail(overrides: Partial<ParsedPstEmail> = {}): ParsedPstEmail {
    return {
        emailId: 'email-1',
        pstPath: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
        messageIdentifier: 'message-1@example.com',
        fingerprint: 'fingerprint-1',
        senderDisplay: 'Alice',
        senderAddress: 'alice@example.com',
        subject: '璇风‘璁ゅ彂甯冨畨鎺?',
        body: '璇蜂粖澶╀笅鐝墠纭鍙戝竷瀹夋帓骞跺洖澶嶆祴璇曠粨鏋溿€?',
        sentAt: 1710000020000,
        messageClass: 'IPM.Note',
        filePathHint: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
        ...overrides,
    };
}

function createDependencies(
    overrides: Partial<RunExecutionDependencies> = {},
    files: ValidationFile[] = [createValidationFile()],
): RunExecutionDependencies {
    return {
        now: vi.fn().mockReturnValueOnce(1710000000000).mockReturnValueOnce(1710000060000),
        loadSettings: vi.fn().mockResolvedValue({
            outlookDirectory: OUTLOOK_DIRECTORY,
            aiBaseUrl: 'https://api.openai.com/v1',
            aiModel: 'gpt-4.1-mini',
        }),
        validateDirectory: vi.fn().mockReturnValue({
            valid: true,
            readablePstCount: files.filter((file) => file.readability === 'readable').length,
            unreadablePstCount: files.filter((file) => file.readability === 'unreadable').length,
            files,
            message: `Found ${files.length} PST file(s).`,
        }),
        loadPstEmails: vi.fn().mockResolvedValue([createParsedEmail()]),
        saveRun: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

function createMockFolder(
    messages: Array<Record<string, unknown>> = [],
    subfolders: Array<Record<string, unknown>> = [],
) {
    let cursor = 0;

    return {
        hasSubfolders: subfolders.length > 0,
        getSubFolders: vi.fn(() => subfolders),
        contentCount: messages.length,
        moveChildCursorTo: vi.fn((position: number) => {
            cursor = position;
        }),
        getNextChild: vi.fn(() => {
            const next = messages[cursor] ?? null;
            cursor += 1;
            return next;
        }),
    };
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(PSTFile).mockReset();
    (
        RunExecutionService as unknown as { activeRunPromise: Promise<unknown> | null }
    ).activeRunPromise = null;
});

describe('RunExecutionService coverage', () => {
    it('returns the PST validation error without attempting to parse or save', async () => {
        const loadPstEmails = vi.fn();
        const saveRun = vi.fn();
        const service = new RunExecutionService(
            createDependencies({
                validateDirectory: vi.fn().mockReturnValue({
                    valid: false,
                    readablePstCount: 0,
                    unreadablePstCount: 0,
                    files: [],
                    message: 'The Outlook directory is not valid.',
                }),
                loadPstEmails,
                saveRun,
            }),
        );

        const result = await service.start();

        expect(result).toEqual({
            success: false,
            runId: null,
            message: 'The Outlook directory is not valid.',
        });
        expect(loadPstEmails).not.toHaveBeenCalled();
        expect(saveRun).not.toHaveBeenCalled();
    });

    it('dedupes extracted items, assigns heuristic confidence levels, and records partial parser errors', async () => {
        const pstFiles = [
            createValidationFile(),
            createValidationFile({
                path: 'C:\\Users\\User\\Documents\\Outlook Files\\archive-2.pst',
                fileName: 'archive-2.pst',
            }),
        ];
        const loadPstEmails = vi
            .fn()
            .mockResolvedValueOnce([
                createParsedEmail({
                    emailId: 'email-medium',
                    messageIdentifier: null,
                    fingerprint: 'fingerprint-medium',
                    subject: 'Launch item',
                    body: 'Please keep track of the launch owner list before Monday and archive the final note.',
                    sentAt: 1710000010000,
                }),
                createParsedEmail({
                    emailId: 'email-low',
                    messageIdentifier: null,
                    fingerprint: 'fingerprint-low',
                    subject: 'plan',
                    body: 'Review docs',
                    sentAt: 1710000020000,
                }),
                createParsedEmail({
                    emailId: 'email-completed',
                    messageIdentifier: 'msg-completed@example.com',
                    fingerprint: 'fingerprint-completed',
                    subject: 'RE: Submit budget',
                    body: 'Please confirm the budget is completed and archive it today.',
                    sentAt: 1710000030000,
                }),
                createParsedEmail({
                    emailId: 'email-duplicate',
                    messageIdentifier: 'msg-completed@example.com',
                    fingerprint: 'fingerprint-duplicate',
                    subject: 'Submit budget',
                    body: 'Please confirm the budget is completed and archive it today.',
                    sentAt: 1710000040000,
                }),
                createParsedEmail({
                    emailId: 'email-ignored',
                    messageIdentifier: 'newsletter@example.com',
                    fingerprint: 'fingerprint-ignored',
                    subject: 'FYI newsletter',
                    body: 'Just sharing the monthly newsletter with background context only.',
                    sentAt: 1710000050000,
                }),
            ])
            .mockRejectedValueOnce(new Error('parser exploded'));
        const saveRun = vi
            .fn<(_: PersistedRunDetail) => Promise<void>>()
            .mockResolvedValue(undefined);
        const service = new RunExecutionService(
            createDependencies({ loadPstEmails, saveRun }, pstFiles),
        );

        const result = await service.start();
        const persistedRun = saveRun.mock.calls[0][0];
        const mediumItem = persistedRun.items.find((item) => item.title === 'Launch item');
        const lowItem = persistedRun.items.find((item) => item.title === 'plan');
        const completedItem = persistedRun.items.find((item) => item.title === 'Submit budget');

        expect(result.success).toBe(true);
        expect(loadPstEmails).toHaveBeenCalledTimes(2);
        expect(persistedRun.status).toBe('completed');
        expect(persistedRun.processedEmailCount).toBe(5);
        expect(persistedRun.itemCount).toBe(3);
        expect(persistedRun.lowConfidenceCount).toBe(1);
        expect(persistedRun.errorMessage).toBe('archive-2.pst: parser exploded');
        expect(mediumItem).toEqual(
            expect.objectContaining({
                confidenceLevel: 'medium',
                sourceStatus: 'verified',
            }),
        );
        expect(lowItem).toEqual(
            expect.objectContaining({
                confidenceLevel: 'low',
                sourceStatus: 'unverified',
                rationale: expect.stringContaining('fingerprint-fallback'),
                evidence: [
                    expect.objectContaining({
                        sourceIdentifier: 'fingerprint-low',
                        searchTerm: 'Review docs',
                    }),
                ],
            }),
        );
        expect(completedItem).toEqual(
            expect.objectContaining({
                itemType: 'completed',
                confidenceLevel: 'high',
                evidence: [
                    expect.objectContaining({
                        sourceIdentifier: 'msg-completed@example.com',
                    }),
                ],
            }),
        );
    });

    it('marks the run as failed when every readable PST parse fails and releases the active lock afterward', async () => {
        const loadPstEmails = vi
            .fn()
            .mockRejectedValueOnce(new Error('broken pst'))
            .mockResolvedValueOnce([]);
        const saveRun = vi
            .fn<(_: PersistedRunDetail) => Promise<void>>()
            .mockResolvedValue(undefined);
        const service = new RunExecutionService(createDependencies({ loadPstEmails, saveRun }));

        const firstResult = await service.start();
        const secondResult = await service.start();
        const failedRun = saveRun.mock.calls[0][0];
        const secondRun = saveRun.mock.calls[1][0];

        expect(firstResult.success).toBe(false);
        expect(failedRun).toEqual(
            expect.objectContaining({
                status: 'failed',
                processedEmailCount: 0,
                itemCount: 0,
                errorMessage: 'mailbox.pst: broken pst',
            }),
        );
        expect(secondResult.success).toBe(true);
        expect(secondResult.message).not.toBe(IN_PROGRESS_MESSAGE);
        expect(secondRun.status).toBe('completed');
    });

    it('walks PST folders recursively, maps supported messages, and closes the PST file', async () => {
        const emptyFolder = createMockFolder();
        const childFolder = createMockFolder([
            {
                messageClass: 'IPM.Task',
                subject: '',
                body: '',
                bodyHTML: '<div>Review draft</div>',
                senderName: '',
                sentRepresentingName: '',
                senderEmailAddress: '',
                sentRepresentingEmailAddress: '',
                emailAddress: 'owner@example.com',
                clientSubmitTime: null,
                messageDeliveryTime: null,
                creationTime: null,
                modificationTime: null,
                internetMessageId: '',
            },
        ]);
        const rootFolder = createMockFolder(
            [
                {
                    messageClass: 'IPM.Note',
                    subject: 'FW: Submit report',
                    body: '',
                    bodyHTML: '<p>Please submit the report before Friday.</p>',
                    senderName: '',
                    sentRepresentingName: 'Operations',
                    senderEmailAddress: '',
                    sentRepresentingEmailAddress: 'ops@example.com',
                    emailAddress: '',
                    clientSubmitTime: new Date('2024-03-10T08:00:00Z'),
                    messageDeliveryTime: null,
                    creationTime: null,
                    modificationTime: null,
                    internetMessageId: '<msg-1@example.com>',
                },
                {
                    messageClass: 'IPM.Appointment',
                    subject: 'Calendar event',
                    body: 'Ignore me',
                },
            ],
            [childFolder, emptyFolder],
        );
        const close = vi.fn();
        vi.mocked(PSTFile).mockImplementation(
            () =>
                ({
                    getRootFolder: () => rootFolder,
                    close,
                }) as never,
        );
        const service = new RunExecutionService();

        const emails = await (
            service as unknown as {
                loadEmailsFromPst: (pstFile: ValidationFile) => Promise<ParsedPstEmail[]>;
            }
        ).loadEmailsFromPst(createValidationFile());

        expect(PSTFile).toHaveBeenCalledWith(
            'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
        );
        expect(rootFolder.getSubFolders).toHaveBeenCalledOnce();
        expect(rootFolder.moveChildCursorTo).toHaveBeenCalledWith(0);
        expect(childFolder.moveChildCursorTo).toHaveBeenCalledWith(0);
        expect(close).toHaveBeenCalledOnce();
        expect(emails).toHaveLength(2);
        expect(emails[0]).toEqual(
            expect.objectContaining({
                subject: '未命名事项',
                body: 'Review draft',
                senderDisplay: '未知发件人',
                senderAddress: 'owner@example.com',
                messageIdentifier: null,
                sentAt: null,
                messageClass: 'IPM.Task',
            }),
        );
        expect(emails[1]).toEqual(
            expect.objectContaining({
                subject: 'FW: Submit report',
                body: 'Please submit the report before Friday.',
                senderDisplay: 'Operations',
                senderAddress: 'ops@example.com',
                messageIdentifier: 'msg-1@example.com',
                sentAt: new Date('2024-03-10T08:00:00Z').getTime(),
                messageClass: 'IPM.Note',
            }),
        );
    });
});
