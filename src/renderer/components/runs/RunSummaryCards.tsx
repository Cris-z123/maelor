import { AlertTriangle, Clock, FileText, Mail } from 'lucide-react';

import type { RunDetail } from '@shared/types/app';

import { formatDate } from './runFormatting';

interface RunSummaryCardsProps {
    run: RunDetail;
}

const cards = [
    { key: 'time', label: '扫描时间', icon: Clock },
    { key: 'pst', label: 'PST 文件数', icon: FileText },
    { key: 'email', label: '处理邮件数', icon: Mail },
    { key: 'items', label: '事项数 / 需复核', icon: AlertTriangle },
] as const;

export function RunSummaryCards({ run }: RunSummaryCardsProps) {
    const values: Record<(typeof cards)[number]['key'], string> = {
        time: formatDate(run.startedAt),
        pst: String(run.pstCount),
        email: String(run.processedEmailCount),
        items: `${run.itemCount} / ${run.lowConfidenceCount}`,
    };

    return (
        <section className="grid gap-4 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <div
                        key={card.key}
                        className="rounded-3xl border border-border border-l-4 border-l-primary/20 bg-card p-5 shadow-sm"
                    >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                            {card.label}
                        </div>
                        <div
                            className={`mt-2 font-semibold text-foreground ${
                                card.key === 'time' ? 'text-sm' : 'text-2xl'
                            }`}
                        >
                            {values[card.key]}
                        </div>
                    </div>
                );
            })}
        </section>
    );
}

export default RunSummaryCards;
