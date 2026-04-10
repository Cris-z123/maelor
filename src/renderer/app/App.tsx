import { useEffect, useState } from 'react';
import { FileSearch, History, Settings } from 'lucide-react';

import type { RunDetail, RunSummary, SettingsView } from '@shared/types/app';

import logoUrl from '@renderer/assets/logo.svg';
import { useTheme } from '@renderer/hooks/useTheme';
import LatestRunReview from '@renderer/components/runs/LatestRunReview';
import OnboardingFlow from './OnboardingFlow';
import { appApi } from './appApi';

type TabKey = 'latest' | 'history' | 'settings';

const navItems: Array<{
    key: Exclude<TabKey, 'settings'>;
    label: string;
    icon: typeof FileSearch;
}> = [
    { key: 'latest', label: '审阅', icon: FileSearch },
    { key: 'history', label: '历史', icon: History },
];

const tabTitles: Record<TabKey, { title: string; description: string }> = {
    latest: {
        title: '审阅',
        description: '手动触发扫描，审阅本次提取结果与来源证据。',
    },
    history: {
        title: '历史',
        description: '查看最近 20 次运行记录并切回任一历史结果。',
    },
    settings: {
        title: '设置',
        description: '管理 Outlook、AI 连接、主题和本地数据维护。',
    },
};

const themeOptions = [
    { value: 'system', label: '系统' },
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
] as const;

const emptySettings: SettingsView = {
    outlookDirectory: '',
    aiBaseUrl: '',
    aiModel: '',
    databasePath: '',
    databaseSizeBytes: 0,
};

function formatDate(timestamp: number | null): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

export default function App() {
    const [activeTab, setActiveTab] = useState<TabKey>('latest');
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [latestRun, setLatestRun] = useState<RunDetail | null>(null);
    const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);
    const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [settings, setSettings] = useState<SettingsView>(emptySettings);
    const [settingsApiKey, setSettingsApiKey] = useState('');
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        void refreshAppState();
    }, []);

    useEffect(() => {
        const currentRun = selectedRun ?? latestRun;
        setSelectedItemId(currentRun?.items[0]?.itemId ?? null);
    }, [latestRun, selectedRun]);

    async function refreshAppState(): Promise<void> {
        setLoading(true);

        try {
            const status = await appApi.getOnboardingStatus();
            setConfigured(status.completed);

            if (!status.completed) {
                setLatestRun(null);
                setRecentRuns([]);
                setSelectedRun(null);
                return;
            }

            const [latest, recent, settingsSummary] = await Promise.all([
                appApi.getLatestRun(),
                appApi.listRecentRuns(),
                appApi.getSettingsSummary(),
            ]);

            setLatestRun(latest);
            setRecentRuns(recent);
            setSettings(settingsSummary);
        } finally {
            setLoading(false);
        }
    }

    async function handleStartRun(): Promise<void> {
        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await appApi.startRun();
            setStatusMessage(result.message);
            await refreshAppState();
        } finally {
            setLoading(false);
        }
    }

    async function handleOpenRun(runId: string): Promise<void> {
        setLoading(true);

        try {
            const detail = await appApi.getRunById(runId);
            setSelectedRun(detail);
            setActiveTab('latest');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveSettings(): Promise<void> {
        setLoading(true);
        setStatusMessage(null);

        try {
            const success = await appApi.updateSettings({
                outlookDirectory: settings.outlookDirectory,
                aiBaseUrl: settings.aiBaseUrl,
                aiModel: settings.aiModel,
                apiKey: settingsApiKey || undefined,
            });

            setStatusMessage(success ? '设置已保存。' : '设置保存失败。');
            await refreshAppState();
            setSettingsApiKey('');
        } finally {
            setLoading(false);
        }
    }

    async function handleClearRuns(): Promise<void> {
        if (!window.confirm('确定要清理所有历史运行记录吗？此操作不可撤销。')) {
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await appApi.clearRuns();
            setStatusMessage(
                result.success
                    ? `已清理 ${result.deletedRunCount} 次运行记录。`
                    : '运行记录清理失败。',
            );
            await refreshAppState();
        } finally {
            setLoading(false);
        }
    }

    async function handleRebuildIndex(): Promise<void> {
        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await appApi.rebuildIndex();
            setStatusMessage(result.message);
            await refreshAppState();
        } finally {
            setLoading(false);
        }
    }

    async function copySearchTerm(searchTerm: string): Promise<void> {
        await navigator.clipboard.writeText(searchTerm);
        setStatusMessage('搜索词已复制。');
    }

    if (configured === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
                正在加载...
            </div>
        );
    }

    if (!configured) {
        return <OnboardingFlow embedded onCompleted={() => void refreshAppState()} />;
    }

    const run = selectedRun ?? latestRun;
    const currentTab = tabTitles[activeTab];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)]">
                <aside className="flex flex-col border-r border-border bg-card/95 px-5 py-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <img alt="Maelor" className="h-10 w-10 rounded-2xl" src={logoUrl} />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                Maelor
                            </p>
                            <h1 className="text-lg font-semibold text-foreground">Outlook 审阅器</h1>
                        </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        Windows 经典 Outlook · PST 数据目录
                    </p>

                    <nav className="mt-10 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const selected = activeTab === item.key;

                            return (
                                <button
                                    key={item.key}
                                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                                        selected
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-foreground hover:bg-muted'
                                    }`}
                                    onClick={() => setActiveTab(item.key)}
                                    type="button"
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-auto pt-6">
                        <button
                            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                                activeTab === 'settings'
                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                    : 'border-border bg-background text-foreground hover:bg-muted'
                            }`}
                            onClick={() => setActiveTab('settings')}
                            type="button"
                        >
                            <Settings className="h-4 w-4" />
                            <span>设置</span>
                        </button>
                    </div>
                </aside>

                <main className="flex min-h-screen flex-col">
                    <header className="flex items-center justify-between border-b border-border bg-background/80 px-8 py-5 backdrop-blur">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">{currentTab.title}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {currentTab.description}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {activeTab === 'latest' && (
                                <>
                                    <button
                                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                                        disabled={loading}
                                        onClick={() => void refreshAppState()}
                                        type="button"
                                    >
                                        刷新
                                    </button>
                                    <button
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={loading}
                                        onClick={() => {
                                            void handleStartRun();
                                        }}
                                        type="button"
                                    >
                                        立即扫描
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 px-8 py-6">
                        {statusMessage && (
                            <div className="mb-6 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm">
                                {statusMessage}
                            </div>
                        )}

                        {activeTab === 'latest' && (
                            <LatestRunReview
                                onCopySearchTerm={(searchTerm) => {
                                    void copySearchTerm(searchTerm);
                                }}
                                onSelectItem={setSelectedItemId}
                                onStartRun={() => {
                                    void handleStartRun();
                                }}
                                run={run}
                                selectedItemId={selectedItemId}
                            />
                        )}

                        {activeTab === 'history' && (
                            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead className="bg-muted/60 text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-5 py-4 font-medium">时间</th>
                                            <th className="px-5 py-4 font-medium">PST 数</th>
                                            <th className="px-5 py-4 font-medium">邮件数</th>
                                            <th className="px-5 py-4 font-medium">事项数</th>
                                            <th className="px-5 py-4 font-medium">状态</th>
                                            <th className="px-5 py-4 font-medium">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {recentRuns.length === 0 && (
                                            <tr>
                                                <td
                                                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                                                    colSpan={6}
                                                >
                                                    还没有历史运行记录。
                                                </td>
                                            </tr>
                                        )}
                                        {recentRuns.map((runSummary) => (
                                            <tr key={runSummary.runId}>
                                                <td className="px-5 py-4 text-foreground">
                                                    {formatDate(runSummary.startedAt)}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.pstCount}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.processedEmailCount}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.itemCount}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.status}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                                                        onClick={() => {
                                                            void handleOpenRun(runSummary.runId);
                                                        }}
                                                        type="button"
                                                    >
                                                        查看详情
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="grid gap-6 xl:grid-cols-2">
                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Outlook 目录
                                    </h3>
                                    <label className="mt-4 block text-sm text-foreground">
                                        <span className="mb-2 block font-medium">数据目录</span>
                                        <input
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                            onChange={(event) =>
                                                setSettings((current) => ({
                                                    ...current,
                                                    outlookDirectory: event.target.value,
                                                }))
                                            }
                                            value={settings.outlookDirectory}
                                        />
                                    </label>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        AI 配置
                                    </h3>
                                    <div className="mt-4 space-y-4">
                                        <label className="block text-sm text-foreground">
                                            <span className="mb-2 block font-medium">
                                                API Base URL
                                            </span>
                                            <input
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                                onChange={(event) =>
                                                    setSettings((current) => ({
                                                        ...current,
                                                        aiBaseUrl: event.target.value,
                                                    }))
                                                }
                                                value={settings.aiBaseUrl}
                                            />
                                        </label>
                                        <label className="block text-sm text-foreground">
                                            <span className="mb-2 block font-medium">Model</span>
                                            <input
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                                onChange={(event) =>
                                                    setSettings((current) => ({
                                                        ...current,
                                                        aiModel: event.target.value,
                                                    }))
                                                }
                                                value={settings.aiModel}
                                            />
                                        </label>
                                        <label className="block text-sm text-foreground">
                                            <span className="mb-2 block font-medium">
                                                新的 API Key
                                            </span>
                                            <input
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                                onChange={(event) =>
                                                    setSettingsApiKey(event.target.value)
                                                }
                                                placeholder="不修改可留空"
                                                type="password"
                                                value={settingsApiKey}
                                            />
                                        </label>
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">外观</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        选择应用显示主题。系统模式会跟随当前操作系统设置。
                                    </p>
                                    <div className="mt-4 flex gap-3">
                                        {themeOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                                                    theme === option.value
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'border border-border bg-background text-foreground hover:bg-muted'
                                                }`}
                                                onClick={() => setTheme(option.value)}
                                                type="button"
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        数据管理
                                    </h3>
                                    <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
                                        <div>
                                            <dt className="font-medium text-foreground">
                                                数据库位置
                                            </dt>
                                            <dd className="mt-1 break-all font-mono text-xs">
                                                {settings.databasePath || '-'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-foreground">
                                                数据库大小
                                            </dt>
                                            <dd className="mt-1">
                                                {Math.max(
                                                    0,
                                                    Math.round(settings.databaseSizeBytes / 1024),
                                                )}{' '}
                                                KB
                                            </dd>
                                        </div>
                                    </dl>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button
                                            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                                            onClick={() => {
                                                void handleRebuildIndex();
                                            }}
                                            type="button"
                                        >
                                            重建索引
                                        </button>
                                        <button
                                            className="rounded-xl border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                                            onClick={() => {
                                                void handleClearRuns();
                                            }}
                                            type="button"
                                        >
                                            清理历史运行记录
                                        </button>
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        保存更改
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                        当前产品只保留 Outlook 目录、AI 连接参数和基础数据管理，不再暴露通知、
                                        模式切换和实验开关。
                                    </p>
                                    <button
                                        className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                                        onClick={() => {
                                            void handleSaveSettings();
                                        }}
                                        type="button"
                                    >
                                        保存设置
                                    </button>
                                </section>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
