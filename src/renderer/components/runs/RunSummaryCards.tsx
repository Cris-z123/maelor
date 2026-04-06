import type { RunDetail } from '@shared/types/app';

import { formatDate } from './runFormatting';

interface RunSummaryCardsProps {
    run: RunDetail;
}

export function RunSummaryCards({ run }: RunSummaryCardsProps) {
    return (
        <section className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">扫描时间</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(run.startedAt)}
                </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">PST 文件数</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{run.pstCount}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">处理邮件数</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {run.processedEmailCount}
                </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                    事项数 / 需复核
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {run.itemCount} / {run.lowConfidenceCount}
                </div>
            </div>
        </section>
    );
}

export default RunSummaryCards;
