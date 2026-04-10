import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import PstDiscovery from '@/outlook/PstDiscovery';

describe('PstDiscovery.validateDirectory', () => {
    const tempRoots: string[] = [];

    afterEach(() => {
        vi.restoreAllMocks();

        for (const root of tempRoots.splice(0)) {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    function createTempDir(): string {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'maelor-pst-'));
        tempRoots.push(root);
        return root;
    }

    it('returns an invalid result when the directory path is missing', () => {
        const result = PstDiscovery.validateDirectory('');

        expect(result.valid).toBe(false);
        expect(result.readablePstCount).toBe(0);
        expect(result.files).toEqual([]);
    });

    it('finds readable PST files recursively within the selected Outlook directory', () => {
        const root = createTempDir();
        const nested = path.join(root, 'Nested', 'Archive');
        fs.mkdirSync(nested, { recursive: true });
        fs.writeFileSync(path.join(root, 'primary.pst'), 'pst-primary');
        fs.writeFileSync(path.join(nested, 'secondary.pst'), 'pst-secondary');
        fs.writeFileSync(path.join(root, 'notes.txt'), 'ignore');

        const result = PstDiscovery.validateDirectory(root);

        expect(result.valid).toBe(true);
        expect(result.readablePstCount).toBe(2);
        expect(result.unreadablePstCount).toBe(0);
        expect(result.files.map((file) => file.fileName)).toEqual(
            expect.arrayContaining(['primary.pst', 'secondary.pst']),
        );
    });

    it('classifies unreadable PST files without hiding readable ones', () => {
        const root = createTempDir();
        const readableFile = path.join(root, 'readable.pst');
        const unreadableFile = path.join(root, 'locked.pst');

        fs.writeFileSync(readableFile, 'pst-readable');
        fs.writeFileSync(unreadableFile, 'pst-unreadable');

        const originalAccessSync = fs.accessSync;
        vi.spyOn(fs, 'accessSync').mockImplementation((targetPath, mode) => {
            if (targetPath === unreadableFile) {
                throw new Error('Access denied');
            }

            return Reflect.apply(originalAccessSync, fs, [targetPath, mode]);
        });

        const result = PstDiscovery.validateDirectory(root);

        expect(result.valid).toBe(true);
        expect(result.readablePstCount).toBe(1);
        expect(result.unreadablePstCount).toBe(1);
        expect(result.files).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    fileName: 'readable.pst',
                    readability: 'readable',
                    reason: null,
                }),
                expect.objectContaining({
                    fileName: 'locked.pst',
                    readability: 'unreadable',
                    reason: 'Access denied',
                }),
            ]),
        );
    });
});
