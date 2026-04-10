import type { RunDetail } from '@shared/types/app';

import RunDetailPanel from './RunDetailPanel';
import RunItemList from './RunItemList';
import RunSummaryCards from './RunSummaryCards';

interface LatestRunReviewProps {
    run: RunDetail | null;
    selectedItemId: string | null;
    onSelectItem: (itemId: string) => void;
    onStartRun: () => void;
    onCopySearchTerm: (searchTerm: string) => void;
}

export function LatestRunReview({
    run,
    selectedItemId,
    onSelectItem,
    onStartRun,
    onCopySearchTerm,
}: LatestRunReviewProps) {
    const selectedItem =
        run?.items.find((item) => item.itemId === selectedItemId) ?? run?.items[0] ?? null;

    if (!run) {
        return (
            <div className="rounded-3xl border border-dashed border-border bg-card px-8 py-14 text-center shadow-sm">
                <h3 className="text-xl font-semibold text-foreground">还没有运行结果</h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    当前配置已完成，但还没有扫描结果。执行一次“立即扫描”后，最新结果页会展示运行摘要、
                    事项列表和来源证据。
                </p>
                <button
                    className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                    onClick={onStartRun}
                    type="button"
                >
                    开始首次扫描
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <RunSummaryCards run={run} />

            <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.85fr)]">
                <RunItemList
                    items={run.items}
                    onSelectItem={onSelectItem}
                    selectedItemId={selectedItem?.itemId ?? null}
                />
                <RunDetailPanel item={selectedItem} onCopySearchTerm={onCopySearchTerm} />
            </section>
        </div>
    );
}

export default LatestRunReview;
