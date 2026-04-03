import { useEffect, useState } from 'react';

import type { RunDetail, RunSummary, SettingsView } from '@shared/types/app';

import LatestRunReview from '@renderer/components/runs/LatestRunReview';
import OnboardingFlow from './OnboardingFlow';
import { appApi } from './appApi';

type TabKey = 'latest' | 'history' | 'settings';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'latest', label: '最新结果' },
  { key: 'history', label: '历史运行' },
  { key: 'settings', label: '设置' },
];

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
      setStatusMessage(result.success ? `已清理 ${result.deletedRunCount} 次运行记录。` : '运行记录清理失败。');
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
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">正在加载...</div>;
  }

  if (!configured) {
    return <OnboardingFlow embedded onCompleted={() => void refreshAppState()} />;
  }

  const run = selectedRun ?? latestRun;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white px-5 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">mailCopilot</p>
            <h1 className="mt-3 text-2xl font-semibold">Outlook 审阅器</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Windows 经典 Outlook · PST 数据目录</p>
          </div>

          <nav className="mt-10 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  activeTab === tab.key ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
            <div>
              <h2 className="text-xl font-semibold">
                {activeTab === 'latest' ? '最新结果' : activeTab === 'history' ? '历史运行' : '设置'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === 'latest'
                  ? '手动触发扫描，审阅本次提取结果与来源证据。'
                  : activeTab === 'history'
                    ? '查看最近 20 次运行记录。'
                    : '只保留 Outlook、AI 配置和数据管理。'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'latest' && (
                <>
                  <button
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    disabled={loading}
                    onClick={() => void refreshAppState()}
                    type="button"
                  >
                    刷新
                  </button>
                  <button
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
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
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
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
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">时间</th>
                      <th className="px-5 py-4 font-medium">PST 数</th>
                      <th className="px-5 py-4 font-medium">邮件数</th>
                      <th className="px-5 py-4 font-medium">事项数</th>
                      <th className="px-5 py-4 font-medium">状态</th>
                      <th className="px-5 py-4 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {recentRuns.length === 0 && (
                      <tr>
                        <td className="px-5 py-8 text-center text-sm text-slate-500" colSpan={6}>
                          还没有历史运行记录。
                        </td>
                      </tr>
                    )}
                    {recentRuns.map((runSummary) => (
                      <tr key={runSummary.runId}>
                        <td className="px-5 py-4 text-slate-700">{formatDate(runSummary.startedAt)}</td>
                        <td className="px-5 py-4 text-slate-700">{runSummary.pstCount}</td>
                        <td className="px-5 py-4 text-slate-700">{runSummary.processedEmailCount}</td>
                        <td className="px-5 py-4 text-slate-700">{runSummary.itemCount}</td>
                        <td className="px-5 py-4 text-slate-700">{runSummary.status}</td>
                        <td className="px-5 py-4">
                          <button
                            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
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
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Outlook 目录</h3>
                  <label className="mt-4 block text-sm text-slate-700">
                    <span className="mb-2 block font-medium">数据目录</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                      onChange={(event) => setSettings((current) => ({ ...current, outlookDirectory: event.target.value }))}
                      value={settings.outlookDirectory}
                    />
                  </label>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">AI 配置</h3>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm text-slate-700">
                      <span className="mb-2 block font-medium">API Base URL</span>
                      <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                        onChange={(event) => setSettings((current) => ({ ...current, aiBaseUrl: event.target.value }))}
                        value={settings.aiBaseUrl}
                      />
                    </label>
                    <label className="block text-sm text-slate-700">
                      <span className="mb-2 block font-medium">Model</span>
                      <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                        onChange={(event) => setSettings((current) => ({ ...current, aiModel: event.target.value }))}
                        value={settings.aiModel}
                      />
                    </label>
                    <label className="block text-sm text-slate-700">
                      <span className="mb-2 block font-medium">新的 API Key</span>
                      <input
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                        onChange={(event) => setSettingsApiKey(event.target.value)}
                        placeholder="不修改可留空"
                        type="password"
                        value={settingsApiKey}
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">数据管理</h3>
                  <dl className="mt-4 space-y-3 text-sm text-slate-600">
                    <div>
                      <dt className="font-medium text-slate-800">数据库位置</dt>
                      <dd className="mt-1 break-all font-mono text-xs">{settings.databasePath || '-'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-800">数据库大小</dt>
                      <dd className="mt-1">{Math.max(0, Math.round(settings.databaseSizeBytes / 1024))} KB</dd>
                    </div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      onClick={() => {
                        void handleRebuildIndex();
                      }}
                      type="button"
                    >
                      重建索引
                    </button>
                    <button
                      className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                      onClick={() => {
                        void handleClearRuns();
                      }}
                      type="button"
                    >
                      清理历史运行记录
                    </button>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">保存更改</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    当前产品只保留 Outlook 目录、AI 连接参数和基础数据管理，不再暴露通知、模式切换和实验开关。
                  </p>
                  <button
                    className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
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
