import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunDetail, RunSummary, SettingsView } from '@shared/types/app';

const { appApi } = vi.hoisted(() => ({
    appApi: {
        getOnboardingStatus: vi.fn(),
        getLatestRun: vi.fn(),
        listRecentRuns: vi.fn(),
        getSettingsSummary: vi.fn(),
        startRun: vi.fn(),
        getRunById: vi.fn(),
        updateSettings: vi.fn(),
        clearRuns: vi.fn(),
        rebuildIndex: vi.fn(),
    },
}));

vi.mock('@renderer/app/appApi', () => ({
    appApi,
}));

vi.mock('@renderer/app/OnboardingFlow', () => ({
    default: () => <div>mock-onboarding</div>,
}));

vi.mock('@renderer/components/runs/LatestRunReview', () => ({
    default: ({ run }: { run: RunDetail | null }) => <div>latest-run:{run?.runId ?? 'none'}</div>,
}));

import App from '@renderer/app/App';

const latestRun: RunDetail = {
    runId: 'run-latest',
    startedAt: 1710000000000,
    finishedAt: 1710000060000,
    status: 'completed',
    pstCount: 1,
    processedEmailCount: 2,
    itemCount: 2,
    lowConfidenceCount: 1,
    outlookDirectory: 'C:\\Outlook',
    message: 'done',
    pstFiles: [],
    items: [
        {
            itemId: 'item-1',
            title: 'First',
            content: 'First item',
            itemType: 'todo',
            confidenceScore: 0.8,
            confidenceLevel: 'high',
            sourceStatus: 'verified',
            rationale: 'why',
            senderDisplay: 'Alice',
            sentAt: 1710000010000,
            subjectSnippet: 'First',
            evidence: [],
        },
    ],
};

const historyRuns: RunSummary[] = [
    {
        runId: 'run-h1',
        startedAt: 1710000100000,
        finishedAt: 1710000160000,
        status: 'completed',
        pstCount: 1,
        processedEmailCount: 2,
        itemCount: 1,
        lowConfidenceCount: 0,
    },
    {
        runId: 'run-h2',
        startedAt: 1710000200000,
        finishedAt: 1710000260000,
        status: 'failed',
        pstCount: 2,
        processedEmailCount: 5,
        itemCount: 0,
        lowConfidenceCount: 0,
    },
];

const settingsSummary: SettingsView = {
    outlookDirectory: 'C:\\Outlook',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiModel: 'gpt-4.1-mini',
    databasePath: 'D:\\app.db',
    databaseSizeBytes: 2048,
};

describe('App Phase 4 surfaces', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        appApi.getOnboardingStatus.mockResolvedValue({
            completed: true,
            currentStep: 3,
            readablePstCount: 1,
            outlookDirectory: 'C:\\Outlook',
        });
        appApi.getLatestRun.mockResolvedValue(latestRun);
        appApi.listRecentRuns.mockResolvedValue(historyRuns);
        appApi.getSettingsSummary.mockResolvedValue(settingsSummary);
        appApi.startRun.mockResolvedValue({
            success: true,
            runId: 'run-next',
            message: 'scan complete',
        });
        appApi.getRunById.mockResolvedValue({
            ...latestRun,
            runId: 'run-h1',
            items: latestRun.items,
        });
        appApi.updateSettings.mockResolvedValue(true);
        appApi.clearRuns.mockResolvedValue({ success: true, deletedRunCount: 2 });
        appApi.rebuildIndex.mockResolvedValue({ success: true, message: 'index rebuilt' });
        Object.defineProperty(window, 'confirm', {
            configurable: true,
            writable: true,
            value: vi.fn().mockReturnValue(true),
        });
    });

    it('renders the recent-runs history table and navigates back to the selected historical run', async () => {
        render(<App />);

        expect(await screen.findByText('latest-run:run-latest')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '历史运行' }));

        expect(await screen.findByText('时间')).toBeInTheDocument();
        expect(screen.getByText('PST 数')).toBeInTheDocument();
        expect(screen.getAllByText('completed').length).toBeGreaterThan(0);
        expect(screen.getByText('failed')).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: '查看详情' })[0]);
        await waitFor(() => {
            expect(appApi.getRunById).toHaveBeenCalledWith('run-h1');
        });
        expect(await screen.findByText('latest-run:run-h1')).toBeInTheDocument();
    });

    it('renders settings sections with summaries and forwards settings maintenance actions', async () => {
        render(<App />);

        expect(await screen.findByText('latest-run:run-latest')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '设置' }));

        expect(await screen.findByText('Outlook 目录')).toBeInTheDocument();
        expect(screen.getByText('AI 配置')).toBeInTheDocument();
        expect(screen.getByText('数据管理')).toBeInTheDocument();
        expect(screen.getByText('保存更改')).toBeInTheDocument();
        expect(screen.getByDisplayValue('C:\\Outlook')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://api.openai.com/v1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('gpt-4.1-mini')).toBeInTheDocument();
        expect(screen.getByText('D:\\app.db')).toBeInTheDocument();
        expect(screen.getByText('2 KB')).toBeInTheDocument();

        const textboxes = screen.getAllByRole('textbox');
        fireEvent.change(textboxes[0], { target: { value: 'C:\\NewOutlook' } });
        fireEvent.change(textboxes[1], { target: { value: 'https://example.com/v1' } });
        fireEvent.change(textboxes[2], { target: { value: 'gpt-4.1' } });
        fireEvent.change(screen.getByPlaceholderText('不修改可留空'), {
            target: { value: 'secret' },
        });

        fireEvent.click(screen.getByRole('button', { name: '保存设置' }));
        await waitFor(() => {
            expect(appApi.updateSettings).toHaveBeenCalledWith({
                outlookDirectory: 'C:\\NewOutlook',
                aiBaseUrl: 'https://example.com/v1',
                aiModel: 'gpt-4.1',
                apiKey: 'secret',
            });
        });

        fireEvent.click(screen.getByRole('button', { name: '重建索引' }));
        expect(await screen.findByText('index rebuilt')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '清理历史运行记录' }));
        await waitFor(() => {
            expect(appApi.clearRuns).toHaveBeenCalledOnce();
        });
        expect(await screen.findByText('已清理 2 次运行记录。')).toBeInTheDocument();
    });
});
