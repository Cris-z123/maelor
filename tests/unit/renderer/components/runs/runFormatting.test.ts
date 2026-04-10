import { describe, expect, it } from 'vitest';

import { getConfidenceTone, getSourceTone } from '@renderer/components/runs/runFormatting';

describe('runFormatting tones', () => {
    it('adds dark-mode classes to confidence tones', () => {
        expect(getConfidenceTone('high')).toContain('dark:bg-emerald-950/30');
        expect(getConfidenceTone('medium')).toContain('dark:bg-amber-950/30');
        expect(getConfidenceTone('low')).toContain('dark:bg-yellow-950/30');
    });

    it('uses semantic muted styling for unverified source tone', () => {
        expect(getSourceTone('verified')).toContain('dark:bg-blue-950/30');
        expect(getSourceTone('unverified')).toBe('bg-muted text-muted-foreground');
    });
});
