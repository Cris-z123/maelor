import { useEffect, useState } from 'react';

import type { ConnectionResult, ValidationResult } from '@shared/types/app';

import { appApi } from './appApi';

interface OnboardingFlowProps {
    embedded?: boolean;
    onCompleted?: () => void;
}

const stepLabels = ['Outlook 目录', 'PST 验证', 'AI 配置'] as const;

function getStepClass(active: boolean): string {
    return active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground';
}

export function OnboardingFlow({ embedded = false, onCompleted }: OnboardingFlowProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [directoryPath, setDirectoryPath] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gpt-4.1-mini');
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [connection, setConnection] = useState<ConnectionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        let active = true;

        async function load(): Promise<void> {
            const [status, settings] = await Promise.all([
                appApi.getOnboardingStatus(),
                appApi.getSettingsSummary(),
            ]);

            if (!active) return;

            setCompleted(status.completed);
            setStep(status.currentStep);
            setDirectoryPath(status.outlookDirectory ?? settings.outlookDirectory ?? '');
            setBaseUrl(settings.aiBaseUrl);
            setModel(settings.aiModel || 'gpt-4.1-mini');
        }

        void load();

        return () => {
            active = false;
        };
    }, []);

    async function handleAutoDetect(): Promise<void> {
        setLoading(true);
        setMessage(null);

        try {
            const detected = await appApi.detectOutlookDirectory();
            if (detected) {
                setDirectoryPath(detected);
                setMessage(`已检测到 Outlook 数据目录：${detected}`);
            } else {
                setMessage('未检测到默认 Outlook 目录，请手动填写。');
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleValidate(): Promise<void> {
        if (!directoryPath.trim()) {
            setMessage('请先填写 Outlook 数据目录。');
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const result = await appApi.validateOutlookDirectory(directoryPath.trim());
            setValidation(result);
            setStep(2);
            setMessage(result.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleConnectionTest(): Promise<void> {
        if (!baseUrl.trim() || !apiKey.trim()) {
            setMessage('请填写 API Base URL 和 API Key。');
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const result = await appApi.testConnection(baseUrl.trim(), apiKey.trim(), model.trim());
            setConnection(result);
            setStep(3);
            setMessage(result.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleComplete(): Promise<void> {
        if (!validation?.valid) {
            setMessage('需要至少一个可读的 PST 文件。');
            return;
        }

        if (!connection?.success) {
            setMessage('需要先通过 AI 连接测试。');
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const result = await appApi.completeSetup({
                directoryPath: directoryPath.trim(),
                baseUrl: baseUrl.trim(),
                apiKey: apiKey.trim(),
                model: model.trim(),
            });

            if (!result.success) {
                setMessage(result.error ?? '初始化配置失败。');
                return;
            }

            setCompleted(true);
            setMessage('配置已完成。');
            onCompleted?.();
        } finally {
            setLoading(false);
        }
    }

    const canFinish =
        Boolean(directoryPath.trim()) &&
        Boolean(baseUrl.trim()) &&
        Boolean(apiKey.trim()) &&
        Boolean(model.trim()) &&
        Boolean(validation?.valid) &&
        Boolean(connection?.success);

    return (
        <div className={embedded ? 'h-full' : 'min-h-screen bg-background'}>
            <div
                className={
                    embedded
                        ? 'h-full'
                        : 'mx-auto flex min-h-screen max-w-5xl items-center px-8 py-12'
                }
            >
                <div className="w-full rounded-3xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-8 py-6">
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Maelor
                        </p>
                        <h1 className="mt-3 text-3xl font-semibold text-foreground">
                            Outlook PST 直连初始化
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                            仅支持 Windows 经典 Outlook 的 PST 数据目录。流程固定为目录配置、PST
                            验证、AI 连接验证。
                        </p>
                    </div>

                    <div className="grid gap-8 px-8 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="space-y-3">
                            {stepLabels.map((label, index) => {
                                const currentStep = (index + 1) as 1 | 2 | 3;
                                const active = step === currentStep;

                                return (
                                    <div
                                        key={label}
                                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${getStepClass(active)}`}
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-xs">
                                            {index + 1}
                                        </span>
                                        <span>{label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-6">
                            <section className="rounded-2xl border border-border bg-card p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">
                                            1. Outlook 目录
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            配置经典 Outlook 本地数据目录，扫描范围只接受 `.pst`。
                                        </p>
                                    </div>
                                    <button
                                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                                        disabled={loading}
                                        onClick={() => {
                                            void handleAutoDetect();
                                        }}
                                        type="button"
                                    >
                                        尝试自动检测
                                    </button>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <label
                                        className="block text-sm font-medium text-foreground"
                                        htmlFor="outlook-directory"
                                    >
                                        Outlook 数据目录
                                    </label>
                                    <input
                                        id="outlook-directory"
                                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                                        onChange={(event) => setDirectoryPath(event.target.value)}
                                        placeholder="例如：C:\\Users\\<user>\\Documents\\Outlook Files"
                                        value={directoryPath}
                                    />
                                    <button
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={loading || !directoryPath.trim()}
                                        onClick={() => {
                                            void handleValidate();
                                        }}
                                        type="button"
                                    >
                                        验证目录并发现 PST
                                    </button>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-border bg-card p-5">
                                <h2 className="text-lg font-semibold text-foreground">2. PST 验证</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    至少需要一个可读 PST 才能完成初始化。
                                </p>

                                {!validation ? (
                                    <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                                        目录验证完成后，这里会列出发现的 PST 文件。
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-2xl bg-muted p-4">
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    可读 PST
                                                </div>
                                                <div className="mt-2 text-2xl font-semibold text-foreground">
                                                    {validation.readablePstCount}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-muted p-4">
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    不可读 PST
                                                </div>
                                                <div className="mt-2 text-2xl font-semibold text-foreground">
                                                    {validation.unreadablePstCount}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl bg-muted p-4">
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    验证状态
                                                </div>
                                                <div className="mt-2 text-sm font-medium text-foreground">
                                                    {validation.valid ? '通过' : '未通过'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-hidden rounded-2xl border border-border">
                                            <table className="min-w-full divide-y divide-border text-sm">
                                                <thead className="bg-muted text-left text-muted-foreground">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium">文件</th>
                                                        <th className="px-4 py-3 font-medium">大小</th>
                                                        <th className="px-4 py-3 font-medium">状态</th>
                                                        <th className="px-4 py-3 font-medium">说明</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border bg-card">
                                                    {validation.files.map((file) => (
                                                        <tr key={file.path}>
                                                            <td className="px-4 py-3 text-foreground">
                                                                <div className="font-medium text-foreground">
                                                                    {file.fileName}
                                                                </div>
                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                    {file.path}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                {Math.max(
                                                                    1,
                                                                    Math.round(
                                                                        file.sizeBytes / 1024 / 1024,
                                                                    ),
                                                                )}{' '}
                                                                MB
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span
                                                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                                        file.readability ===
                                                                        'readable'
                                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                                    }`}
                                                                >
                                                                    {file.readability === 'readable'
                                                                        ? '可读'
                                                                        : '不可读'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                {file.reason ?? '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-2xl border border-border bg-card p-5">
                                <h2 className="text-lg font-semibold text-foreground">3. AI 配置</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    当前版本只支持一个远程 OpenAI-compatible provider。
                                </p>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <label className="block text-sm text-foreground">
                                        <span className="mb-2 block font-medium">API Base URL</span>
                                        <input
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                                            onChange={(event) => setBaseUrl(event.target.value)}
                                            placeholder="https://api.openai.com/v1"
                                            value={baseUrl}
                                        />
                                    </label>

                                    <label className="block text-sm text-foreground">
                                        <span className="mb-2 block font-medium">Model</span>
                                        <input
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                                            onChange={(event) => setModel(event.target.value)}
                                            value={model}
                                        />
                                    </label>
                                </div>

                                <label className="mt-4 block text-sm text-foreground">
                                    <span className="mb-2 block font-medium">API Key</span>
                                    <input
                                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                                        onChange={(event) => setApiKey(event.target.value)}
                                        placeholder="sk-..."
                                        type="password"
                                        value={apiKey}
                                    />
                                </label>

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <button
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={loading || !baseUrl.trim() || !apiKey.trim()}
                                        onClick={() => {
                                            void handleConnectionTest();
                                        }}
                                        type="button"
                                    >
                                        测试连接
                                    </button>
                                    {connection && (
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                connection.success
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                            }`}
                                        >
                                            {connection.success
                                                ? `连接成功${connection.responseTimeMs ? ` · ${connection.responseTimeMs}ms` : ''}`
                                                : '连接失败'}
                                        </span>
                                    )}
                                </div>
                            </section>

                            {message && (
                                <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
                                    {message}
                                </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                                <div className="text-sm text-muted-foreground">
                                    {completed
                                        ? '初始化已完成。'
                                        : '完成条件：至少一个可读 PST，并通过 AI 连接测试。'}
                                </div>
                                <button
                                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={loading || completed || !canFinish}
                                    onClick={() => {
                                        void handleComplete();
                                    }}
                                    type="button"
                                >
                                    完成配置
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OnboardingFlow;
