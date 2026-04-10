import type { ActionItemView } from '@shared/types/app';

import { formatConfidence, formatDate, getConfidenceTone, getSourceTone } from './runFormatting';

interface RunItemListProps {
    items: ActionItemView[];
    selectedItemId: string | null;
    onSelectItem: (itemId: string) => void;
}

export function RunItemList({ items, selectedItemId, onSelectItem }: RunItemListProps) {
    return (
        <div className="rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
                <h3 className="text-lg font-semibold text-foreground">事项列表</h3>
            </div>

            <div className="max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto p-4">
                {items.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        当前运行没有生成事项。请检查 PST 内容，或重新执行一次扫描。
                    </div>
                )}

                {items.map((item) => {
                    const isSelected = selectedItemId === item.itemId;

                    return (
                        <button
                            key={item.itemId}
                            aria-pressed={isSelected}
                            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                item.confidenceLevel === 'low'
                                    ? 'bg-yellow-50 dark:bg-yellow-950/30'
                                    : 'bg-card'
                            } ${
                                isSelected
                                    ? 'border-primary shadow-sm'
                                    : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => onSelectItem(item.itemId)}
                            type="button"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold text-foreground">
                                    {item.title}
                                </h4>
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                    {item.itemType === 'todo' ? '待办' : '已完成'}
                                </span>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getConfidenceTone(item.confidenceLevel)}`}
                                >
                                    {item.confidenceLevel === 'high'
                                        ? '高'
                                        : item.confidenceLevel === 'medium'
                                          ? '中'
                                          : '低'}
                                    置信度 · {formatConfidence(item.confidenceScore)}
                                </span>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getSourceTone(item.sourceStatus)}`}
                                >
                                    {item.sourceStatus === 'verified' ? '已验证' : '待确认'}
                                </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {item.content}
                            </p>
                            <p className="mt-3 text-xs text-muted-foreground">
                                {item.senderDisplay} · {formatDate(item.sentAt)} ·{' '}
                                {item.subjectSnippet}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default RunItemList;
