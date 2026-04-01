import { useEffect, useState } from 'react';

import type { MvpActionItemView, MvpRunDetail, MvpRunSummary, MvpSettingsView } from '@shared/types/mvp';

import OnboardingFlow from './OnboardingFlow';
import { mvpApi } from './mvpApi';

type TabKey = 'latest' | 'history' | 'settings';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'latest', label: '最新结果' },
  { key: 'history', label: '历史运行' },
  { key: 'settings', label: '设置' },
];

const emptySettings: MvpSettingsView = {
  outlookDirectory: '',
  aiBaseUrl: '',
  aiModel: '',
  databasePath: '',
  databaseSizeBytes: 0,
};

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
  });
}

function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function getConfidenceTone(level: MvpActionItemView['confidenceLevel']): string {
  if (level === 'high') return 'bg-emerald-50 text-emerald-700';
  if (level === 'medium') return 'bg-amber-50 text-amber-700';
  return 'bg-yellow-100 text-yellow-800';
}

function getSourceTone(status: MvpActionItemView['sourceStatus']): string {
  return status === 'verified' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('latest');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestRun, setLatestRun] = useState<MvpRunDetail | null>(null);
  const [recentRuns, setRecentRuns] = useState<MvpRunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<MvpRunDetail | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [settings, setSettings] = useState<MvpSettingsView>(emptySettings);
  const [settingsApiKey, setSettingsApiKey] = useState('');

  useEffect(() => {
    void refreshAppState();
  }, []);

  useEffect(() => {
    const currentRun = selectedRun ?? latestRun;
    const nextItemId = currentRun?.items[0]?.itemId ?? null;
    setSelectedItemId(nextItemId);
  }, [latestRun, selectedRun]);

  async function refreshAppState(): Promise<void> {
    setLoading(true);

    try {
      const status = await mvpApi.getOnboardingStatus();
      setConfigured(status.completed);

      if (!status.completed) {
        setLatestRun(null);
        setRecentRuns([]);
        setSelectedRun(null);
        return;
      }

      const [latest, recent, settingsSummary] = await Promise.all([
        mvpApi.getLatestRun(),
        mvpApi.listRecentRuns(),
        mvpApi.getSettingsSummary(),
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
      const result = await mvpApi.startRun();
      setStatusMessage(result.message);
      await refreshAppState();
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenRun(runId: string): Promise<void> {
    setLoading(true);

    try {
      const detail = await mvpApi.getRunById(runId);
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
      const success = await mvpApi.updateSettings({
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
    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await mvpApi.clearRuns();
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
      const result = await mvpApi.rebuildIndex();
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
  const selectedItem = run?.items.find((item) => item.itemId === selectedItemId) ?? run?.items[0] ?? null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white px-5 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">mailCopilot MVP</p>
            <h1 className="mt-3 text-2xl font-semibold">Outlook 审阅器</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Windows 经典 Outlook · PST only</p>
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
              <>
                {!run ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">还没有运行结果</h3>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                      当前配置已完成，但还没有扫描结果。执行一次“立即扫描”后，最新结果页会展示运行摘要、事项列表和来源证据。
                    </p>
                    <button
                      className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                      onClick={() => {
                        void handleStartRun();
                      }}
                      type="button"
                    >
                      开始首次扫描
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <section className="grid gap-4 lg:grid-cols-4">
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-xs uppercase tracking-wide text-slate-500">扫描时间</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{formatDate(run.startedAt)}</div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-xs uppercase tracking-wide text-slate-500">PST 文件数</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{run.pstCount}</div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-xs uppercase tracking-wide text-slate-500">处理邮件数</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{run.processedEmailCount}</div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-xs uppercase tracking-wide text-slate-500">事项数 / 需复核</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">
                          {run.itemCount} / {run.lowConfidenceCount}
                        </div>
                      </div>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.85fr)]">
                      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                          <h3 className="text-lg font-semibold text-slate-900">事项列表</h3>
                        </div>

                        <div className="max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto p-4">
                          {run.items.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                              当前运行没有生成事项。PST 发现链路已跑通，提取链路下一阶段继续补齐。
                            </div>
                          )}

                          {run.items.map((item) => {
                            const isSelected = selectedItem?.itemId === item.itemId;
                            return (
                              <button
                                key={item.itemId}
                                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                  item.confidenceLevel === 'low' ? 'bg-yellow-50' : 'bg-white'
                                } ${
                                  isSelected ? 'border-blue-600 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                                }`}
                                onClick={() => setSelectedItemId(item.itemId)}
                                type="button"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                    {item.itemType === 'todo' ? '待办' : '已完成'}
                                  </span>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getConfidenceTone(item.confidenceLevel)}`}>
                                    {item.confidenceLevel === 'high'
                                      ? '高'
                                      : item.confidenceLevel === 'medium'
                                        ? '中'
                                        : '低'}
                                    置信度 · {formatConfidence(item.confidenceScore)}
                                  </span>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getSourceTone(item.sourceStatus)}`}>
                                    {item.sourceStatus === 'verified' ? '已验证' : '待确认'}
                                  </span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-600">{item.content}</p>
                                <p className="mt-3 text-xs text-slate-500">
                                  {item.senderDisplay} · {formatDate(item.sentAt)} · {item.subjectSnippet}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                          <h3 className="text-lg font-semibold text-slate-900">事项详情</h3>
                        </div>

                        {!selectedItem ? (
                          <div className="px-5 py-8 text-sm text-slate-500">选择一条事项后，这里会显示完整依据和来源证据。</div>
                        ) : (
                          <div className="space-y-6 px-5 py-5">
                            <section>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-xl font-semibold text-slate-900">{selectedItem.title}</h4>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getConfidenceTone(selectedItem.confidenceLevel)}`}>
                                  {selectedItem.confidenceLevel === 'high'
                                    ? '高'
                                    : selectedItem.confidenceLevel === 'medium'
                                      ? '中'
                                      : '低'}
                                  置信度
                                </span>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-slate-700">{selectedItem.content}</p>
                            </section>

                            <section>
                              <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-500">判断依据</h5>
                              <p className="mt-2 text-sm leading-7 text-slate-700">{selectedItem.rationale || '暂无 AI 判断依据。'}</p>
                            </section>

                            <section>
                              <div className="flex items-center justify-between gap-3">
                                <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-500">来源证据</h5>
                                {selectedItem.evidence[0] && (
                                  <button
                                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                    onClick={() => {
                                      void copySearchTerm(selectedItem.evidence[0].searchTerm);
                                    }}
                                    type="button"
                                  >
                                    复制搜索词
                                  </button>
                                )}
                              </div>

                              <div className="mt-3 space-y-3">
                                {selectedItem.evidence.map((evidence) => (
                                  <div key={evidence.evidenceId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-sm font-medium text-slate-900">
                                      {evidence.senderDisplay} · {formatDate(evidence.sentAt)}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600">{evidence.subjectSnippet}</div>
                                    <dl className="mt-3 space-y-2 text-xs text-slate-500">
                                      <div>
                                        <dt className="font-semibold text-slate-700">搜索词</dt>
                                        <dd className="mt-1 font-mono">{evidence.searchTerm}</dd>
                                      </div>
                                      <div>
                                        <dt className="font-semibold text-slate-700">文件路径</dt>
                                        <dd className="mt-1 break-all font-mono">{evidence.filePath}</dd>
                                      </div>
                                      <div>
                                        <dt className="font-semibold text-slate-700">标识</dt>
                                        <dd className="mt-1 font-mono">{evidence.sourceIdentifier}</dd>
                                      </div>
                                    </dl>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </>
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
                    MVP 只保留 Outlook 目录、AI 连接参数和基础数据管理，不再暴露通知、模式切换和实验开关。
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
