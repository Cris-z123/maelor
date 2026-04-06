import type { ActionItemView } from '@shared/types/app';

import EvidenceList from './EvidenceList';
import { getConfidenceTone } from './runFormatting';

interface RunDetailPanelProps {
    item: ActionItemView | null;
    onCopySearchTerm: (searchTerm: string) => void;
}

export function RunDetailPanel({ item, onCopySearchTerm }: RunDetailPanelProps) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">事项详情</h3>
            </div>

            {!item ? (
                <div className="px-5 py-8 text-sm text-slate-500">
                    选择一条事项后，这里会显示完整依据和来源证据。
                </div>
            ) : (
                <div className="space-y-6 px-5 py-5">
                    <section>
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xl font-semibold text-slate-900">{item.title}</h4>
                            <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${getConfidenceTone(item.confidenceLevel)}`}
                            >
                                {item.confidenceLevel === 'high'
                                    ? '高'
                                    : item.confidenceLevel === 'medium'
                                      ? '中'
                                      : '低'}
                                置信度
                            </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-700">{item.content}</p>
                    </section>

                    <section>
                        <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            判断依据
                        </h5>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                            {item.rationale || '暂无 AI 判断依据。'}
                        </p>
                    </section>

                    <EvidenceList
                        defaultExpanded={item.confidenceLevel === 'low'}
                        evidence={item.evidence}
                        onCopySearchTerm={onCopySearchTerm}
                    />
                </div>
            )}
        </div>
    );
}

export default RunDetailPanel;
