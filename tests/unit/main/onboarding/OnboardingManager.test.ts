import fs from 'fs';
import os from 'os';
import path from 'path';

import { app } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/database/Database', () => ({
    default: {
        getDatabase: vi.fn(),
    },
}));

import DatabaseManager from '@/database/Database';
import OnboardingManager from '@/onboarding/OnboardingManager';

describe('OnboardingManager.detectOutlookDirectory', () => {
    let tempRoot: string;
    let documentsPath: string;
    let appDataPath: string;
    let homePath: string;
    let getPathSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();

        tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mailcopilot-onboarding-'));
        documentsPath = path.join(tempRoot, 'Documents');
        appDataPath = path.join(tempRoot, 'AppData', 'Roaming');
        homePath = path.join(tempRoot, 'Home');

        fs.mkdirSync(documentsPath, { recursive: true });
        fs.mkdirSync(appDataPath, { recursive: true });
        fs.mkdirSync(homePath, { recursive: true });

        getPathSpy = vi.spyOn(app, 'getPath').mockImplementation((name: string) => {
            if (name === 'documents') return documentsPath;
            if (name === 'appData') return appDataPath;
            if (name === 'home') return homePath;
            return tempRoot;
        });
    });

    afterEach(() => {
        getPathSpy.mockRestore();
        fs.rmSync(tempRoot, { recursive: true, force: true });
    });

    it('returns the first default Outlook directory that contains a PST file', () => {
        const outlookFilesDir = path.join(documentsPath, 'Outlook Files');
        fs.mkdirSync(outlookFilesDir, { recursive: true });
        fs.writeFileSync(path.join(outlookFilesDir, 'mailbox.pst'), 'pst');

        const result = OnboardingManager.detectOutlookDirectory();

        expect(result).toEqual({
            detectedPath: outlookFilesDir,
            reason: 'Detected PST files in a default Outlook directory.',
        });
    });

    it('falls back across default locations and ignores directories without PST files', () => {
        fs.mkdirSync(path.join(documentsPath, 'Outlook Files'), { recursive: true });
        const roamingOutlookDir = path.join(appDataPath, 'Microsoft', 'Outlook');
        fs.mkdirSync(roamingOutlookDir, { recursive: true });
        fs.writeFileSync(path.join(roamingOutlookDir, 'archive.PST'), 'pst');

        const result = OnboardingManager.detectOutlookDirectory();

        expect(result.detectedPath).toBe(roamingOutlookDir);
        expect(result.reason).toContain('Detected PST files');
    });

    it('returns an advisory null result and does not persist configuration when nothing is found', () => {
        const result = OnboardingManager.detectOutlookDirectory();

        expect(result).toEqual({
            detectedPath: null,
            reason: 'No default Outlook PST directory was detected.',
        });
        expect(DatabaseManager.getDatabase).not.toHaveBeenCalled();
    });
});
