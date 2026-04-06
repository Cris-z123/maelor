import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
    ipcMain: {
        handle: vi.fn(),
        removeHandler: vi.fn(),
    },
}));

import { IPC_CHANNELS } from '@/ipc/channels';
import { registerAppIpcHandlers } from '@/ipc/registerAppHandlers';

describe('Run IPC contracts', () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();

    const deps = {
        getOnboardingStatus: vi.fn(),
        detectOutlookDirectory: vi.fn(),
        validateOutlookDirectory: vi.fn(),
        testConnection: vi.fn(),
        completeOnboarding: vi.fn(),
        startRun: vi.fn(),
        getLatestRun: vi.fn(),
        getRunById: vi.fn(),
        listRecentRuns: vi.fn(),
        getSettings: vi.fn(),
        updateSettings: vi.fn(),
        getDataSummary: vi.fn(),
        clearRuns: vi.fn(),
        rebuildIndex: vi.fn(),
    };

    beforeEach(async () => {
        handlers.clear();
        vi.clearAllMocks();

        vi.mocked(ipcMain.handle).mockImplementation(
            (channel: string, handler: (...args: unknown[]) => unknown) => {
                handlers.set(channel, handler);
                return ipcMain;
            },
        );

        deps.startRun.mockResolvedValue({
            success: true,
            runId: 'run-1',
            message: '扫描完成，处理 12 封邮件，提取 3 条事项。',
        });
        deps.getLatestRun.mockResolvedValue({
            runId: 'run-1',
            startedAt: 1710000000000,
            finishedAt: 1710000060000,
            status: 'completed',
            pstCount: 1,
            processedEmailCount: 12,
            itemCount: 3,
            lowConfidenceCount: 1,
            outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
            message: '扫描完成，处理 12 封邮件，提取 3 条事项。',
            pstFiles: [],
            items: [
                {
                    itemId: 'item-1',
                    title: '确认发布安排',
                    content: '请确认本周发布安排。',
                    itemType: 'todo',
                    confidenceScore: 0.88,
                    confidenceLevel: 'high',
                    sourceStatus: 'verified',
                    rationale: 'Detected action language in the source email.',
                    senderDisplay: 'Alice',
                    sentAt: 1710000020000,
                    subjectSnippet: '请确认发布安排',
                    evidence: [
                        {
                            evidenceId: 'evidence-1',
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
        });
        deps.getRunById.mockResolvedValue({
            runId: 'run-9',
            startedAt: 1710001000000,
            finishedAt: 1710001060000,
            status: 'completed',
            pstCount: 2,
            processedEmailCount: 20,
            itemCount: 4,
            lowConfidenceCount: 1,
            outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
            message: '扫描完成，处理 20 封邮件，提取 4 条事项。',
            pstFiles: [],
            items: [],
        });

        await registerAppIpcHandlers(deps);
    });

    it('returns the runs.start contract', async () => {
        const handler = handlers.get(IPC_CHANNELS.RUNS_START);
        const result = await handler?.({});

        expect(deps.startRun).toHaveBeenCalledOnce();
        expect(result).toEqual({
            success: true,
            runId: 'run-1',
            message: '扫描完成，处理 12 封邮件，提取 3 条事项。',
        });
    });

    it('returns the latest persisted run detail', async () => {
        const handler = handlers.get(IPC_CHANNELS.RUNS_GET_LATEST);
        const result = await handler?.({});

        expect(deps.getLatestRun).toHaveBeenCalledOnce();
        expect(result).toEqual(
            expect.objectContaining({
                runId: 'run-1',
                itemCount: 3,
                items: [
                    expect.objectContaining({
                        itemId: 'item-1',
                        evidence: [expect.objectContaining({ evidenceId: 'evidence-1' })],
                    }),
                ],
            }),
        );
    });

    it('returns a specific run by id', async () => {
        const handler = handlers.get(IPC_CHANNELS.RUNS_GET_BY_ID);
        const result = await handler?.({}, { runId: 'run-9' });

        expect(deps.getRunById).toHaveBeenCalledWith('run-9');
        expect(result).toEqual(
            expect.objectContaining({
                runId: 'run-9',
                processedEmailCount: 20,
            }),
        );
    });
});
