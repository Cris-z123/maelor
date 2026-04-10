import type { ActionItemView } from '@shared/types/app';

export function formatDate(timestamp: number | null): string {
    if (!timestamp) {
        return '-';
    }

    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

export function formatConfidence(score: number): string {
    return `${Math.round(score * 100)}%`;
}

export function getConfidenceTone(level: ActionItemView['confidenceLevel']): string {
    if (level === 'high') {
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
    }

    if (level === 'medium') {
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
    }

    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400';
}

export function getSourceTone(status: ActionItemView['sourceStatus']): string {
    return status === 'verified'
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
        : 'bg-muted text-muted-foreground';
}
