import { useEffect, useState } from 'react';

import type { EvidenceView } from '@shared/types/app';

import { formatDate } from './runFormatting';

interface EvidenceListProps {
    evidence: EvidenceView[];
    defaultExpanded: boolean;
    onCopySearchTerm: (searchTerm: string) => void;
}

export function EvidenceList({ evidence, defaultExpanded, onCopySearchTerm }: EvidenceListProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    useEffect(() => {
        setExpanded(defaultExpanded);
    }, [defaultExpanded, evidence]);

    return (
        <section>
            <div className="flex items-center justify-between gap-3">
                <h5 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    来源证据
                </h5>
                <div className="flex items-center gap-2">
                    {evidence[0] && (
                        <button
                            className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                            onClick={() => onCopySearchTerm(evidence[0].searchTerm)}
                            type="button"
                        >
                            复制搜索词
                        </button>
                    )}
                    {evidence.length > 0 && (
                        <button
                            aria-expanded={expanded}
                            className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                            onClick={() => setExpanded((current) => !current)}
                            type="button"
                        >
                            {expanded ? '收起证据' : `展开证据 (${evidence.length})`}
                        </button>
                    )}
                </div>
            </div>

            {!expanded && (
                <p className="mt-3 text-sm text-muted-foreground">
                    当前事项关联 {evidence.length} 条证据，点击“展开证据”查看详情。
                </p>
            )}

            {expanded && (
                <div className="mt-3 space-y-3">
                    {evidence.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                            当前事项没有可展示的来源证据。
                        </div>
                    )}

                    {evidence.map((item) => (
                        <div
                            key={item.evidenceId}
                            className="rounded-2xl border border-border bg-muted p-4"
                        >
                            <div className="text-sm font-medium text-foreground">
                                {item.senderDisplay} · {formatDate(item.sentAt)}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                {item.subjectSnippet}
                            </div>
                            <dl className="mt-3 space-y-2 text-xs text-muted-foreground">
                                <div>
                                    <dt className="font-semibold text-foreground">搜索词</dt>
                                    <dd className="mt-1 font-mono">{item.searchTerm}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-foreground">文件路径</dt>
                                    <dd className="mt-1 break-all font-mono">{item.filePath}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-foreground">标识</dt>
                                    <dd className="mt-1 font-mono">{item.sourceIdentifier}</dd>
                                </div>
                            </dl>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default EvidenceList;
