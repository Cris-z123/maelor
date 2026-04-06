import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import LatestRunReview from '@renderer/components/runs/LatestRunReview';

const runFixture = {
    runId: 'run-1',
    startedAt: 1710000000000,
    finishedAt: 1710000060000,
    status: 'completed' as const,
    pstCount: 1,
    processedEmailCount: 12,
    itemCount: 2,
    lowConfidenceCount: 1,
    outlookDirectory: 'C:\\Users\\User\\Documents\\Outlook Files',
    message: '扫描完成，处理 12 封邮件，提取 2 条事项。',
    pstFiles: [],
    items: [
        {
            itemId: 'item-1',
            title: '确认发布安排',
            content: '请确认本周发布安排。',
            itemType: 'todo' as const,
            confidenceScore: 0.88,
            confidenceLevel: 'high' as const,
            sourceStatus: 'verified' as const,
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
        {
            itemId: 'item-2',
            title: '跟进测试缺陷',
            content: '需要跟进测试缺陷并安排回归验证。',
            itemType: 'todo' as const,
            confidenceScore: 0.48,
            confidenceLevel: 'low' as const,
            sourceStatus: 'unverified' as const,
            rationale: 'Only a weak action signal was found in the source email.',
            senderDisplay: 'Bob',
            sentAt: 1710000040000,
            subjectSnippet: '跟进测试缺陷',
            evidence: [
                {
                    evidenceId: 'evidence-2',
                    senderDisplay: 'Bob',
                    subjectSnippet: '跟进测试缺陷',
                    sentAt: 1710000040000,
                    searchTerm: '跟进测试缺陷',
                    filePath: 'C:\\Users\\User\\Documents\\Outlook Files\\mailbox.pst',
                    sourceIdentifier: 'fingerprint-2',
                },
            ],
        },
    ],
};

describe('LatestRunReview', () => {
    it('renders the latest-run list/detail review layout', async () => {
        const user = userEvent.setup();

        render(
            <LatestRunReview
                onCopySearchTerm={vi.fn()}
                onSelectItem={vi.fn()}
                onStartRun={vi.fn()}
                run={runFixture}
                selectedItemId="item-1"
            />,
        );

        expect(screen.getByText('事项列表')).toBeInTheDocument();
        expect(screen.getByText('事项详情')).toBeInTheDocument();
        expect(screen.getAllByText('确认发布安排').length).toBeGreaterThan(0);
        expect(screen.getAllByText('请确认本周发布安排。').length).toBeGreaterThan(0);

        await user.click(screen.getByRole('button', { name: /展开证据/i }));
        expect(screen.getByText('message-1@example.com')).toBeInTheDocument();
    });

    it('expands evidence by default for low-confidence items and copies the search term', async () => {
        const user = userEvent.setup();
        const onCopySearchTerm = vi.fn();

        render(
            <LatestRunReview
                onCopySearchTerm={onCopySearchTerm}
                onSelectItem={vi.fn()}
                onStartRun={vi.fn()}
                run={runFixture}
                selectedItemId="item-2"
            />,
        );

        expect(screen.getByText('fingerprint-2')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /展开证据/i })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '复制搜索词' }));
        expect(onCopySearchTerm).toHaveBeenCalledWith('跟进测试缺陷');
    });

    it('renders the empty state when no run exists yet', () => {
        render(
            <LatestRunReview
                onCopySearchTerm={vi.fn()}
                onSelectItem={vi.fn()}
                onStartRun={vi.fn()}
                run={null}
                selectedItemId={null}
            />,
        );

        expect(screen.getByText('还没有运行结果')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '开始首次扫描' })).toBeInTheDocument();
    });
});
