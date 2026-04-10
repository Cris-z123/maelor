import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RunDetail, RunSummary, SettingsView } from '@shared/types/app';

const { appApi, themeState } = vi.hoisted(() => ({
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
    themeState: {
        theme: 'system' as 'system' | 'light' | 'dark',
        setTheme: vi.fn(),
    },
}));

vi.mock('@renderer/app/appApi', () => ({
    appApi,
}));

vi.mock('@renderer/hooks/useTheme', () => ({
    useTheme: () => themeState,
}));

vi.mock('@renderer/app/OnboardingFlow', () => ({
    default: ({ embedded, onCompleted }: { embedded?: boolean; onCompleted?: () => void }) => (
        <div>
            <span>mock-onboarding-{embedded ? 'embedded' : 'standalone'}</span>
            <button onClick={() => onCompleted?.()} type="button">
                finish-onboarding
            </button>
        </div>
    ),
}));

vi.mock('@renderer/components/runs/LatestRunReview', () => ({
    default: ({
        run,
        selectedItemId,
        onStartRun,
        onCopySearchTerm,
        onSelectItem,
    }: {
        run: RunDetail | null;
        selectedItemId: string | null;
        onStartRun: () => void;
        onCopySearchTerm: (searchTerm: string) => void;
        onSelectItem: (itemId: string) => void;
    }) => (
        <div>
            <div>latest-run:{run?.runId ?? 'none'}</div>
            <div>selected-item:{selectedItemId ?? 'none'}</div>
            <button onClick={onStartRun} type="button">
                latest-start
            </button>
            <button onClick={() => onCopySearchTerm('term-1')} type="button">
                latest-copy
            </button>
            <button onClick={() => onSelectItem('item-2')} type="button">
                latest-select
            </button>
        </div>
    ),
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
        {
            itemId: 'item-2',
            title: 'Second',
            content: 'Second item',
            itemType: 'todo',
            confidenceScore: 0.6,
            confidenceLevel: 'medium',
            sourceStatus: 'verified',
            rationale: 'why',
            senderDisplay: 'Bob',
            sentAt: 1710000020000,
            subjectSnippet: 'Second',
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
];

const settingsSummary: SettingsView = {
    outlookDirectory: 'C:\\Outlook',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiModel: 'gpt-4.1-mini',
    databasePath: 'D:\\app.db',
    databaseSizeBytes: 2048,
};

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        themeState.theme = 'system';
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
            items: [{ ...latestRun.items[1] }],
        });
        appApi.updateSettings.mockResolvedValue(true);
        appApi.clearRuns.mockResolvedValue({ success: true, deletedRunCount: 2 });
        appApi.rebuildIndex.mockResolvedValue({ success: true, message: 'index rebuilt' });
        Object.defineProperty(window.navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
        Object.defineProperty(window, 'confirm', {
            configurable: true,
            writable: true,
            value: vi.fn().mockReturnValue(true),
        });
    });

    it('renders the onboarding flow when setup is incomplete and refreshes after completion', async () => {
        appApi.getOnboardingStatus
            .mockResolvedValueOnce({
                completed: false,
                currentStep: 1,
                readablePstCount: 0,
                outlookDirectory: null,
            })
            .mockResolvedValueOnce({
                completed: true,
                currentStep: 3,
                readablePstCount: 1,
                outlookDirectory: 'C:\\Outlook',
            });

        render(<App />);

        expect(await screen.findByText('mock-onboarding-embedded')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'finish-onboarding' }));

        expect(await screen.findByText('Maelor')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '审阅' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '历史' })).toBeInTheDocument();
        expect(appApi.getLatestRun).toHaveBeenCalled();
    });

    it('renders latest results, starts a run, refreshes state, and copies search terms', async () => {
        render(<App />);

        expect(await screen.findByText('latest-run:run-latest')).toBeInTheDocument();
        expect(screen.getByText('selected-item:item-1')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'latest-select' }));
        expect(screen.getByText('selected-item:item-2')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'latest-copy' }));
        expect(await screen.findByText('搜索词已复制。')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'latest-start' }));
        await waitFor(() => {
            expect(appApi.startRun).toHaveBeenCalled();
        });
        expect(await screen.findByText('scan complete')).toBeInTheDocument();
        expect(appApi.getOnboardingStatus).toHaveBeenCalledTimes(2);
    });

    it('opens settings from the sidebar action and forwards theme selection', async () => {
        render(<App />);

        expect(await screen.findByText('latest-run:run-latest')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '设置' }));

        expect(await screen.findByRole('heading', { name: '外观' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '深色' }));

        expect(themeState.setTheme).toHaveBeenCalledWith('dark');
    });
});
