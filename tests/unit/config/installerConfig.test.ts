import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readWorkspaceFile(...segments: string[]): string {
    return readFileSync(path.resolve(process.cwd(), ...segments), 'utf8');
}

describe('windows installer configuration', () => {
    it('includes the custom NSIS script for uninstall cleanup', () => {
        const builderConfig = readWorkspaceFile('electron-builder.yml');
        const installerScriptPath = path.resolve(process.cwd(), 'build', 'installer.nsh');

        expect(builderConfig).toContain('include: build/installer.nsh');
        expect(existsSync(installerScriptPath)).toBe(true);
    });

    it('kills the running app tree and removes user data on uninstall', () => {
        const installerScript = readWorkspaceFile('build', 'installer.nsh');

        expect(installerScript).toContain('!macro customCheckAppRunning');
        expect(installerScript).toContain('taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}"');
        expect(installerScript).toContain('!macro customUnInstall');
        expect(installerScript).toContain('${if} ${isUpdated}');
        expect(installerScript).toContain('Skipping user data removal during application update.');
        expect(installerScript).toContain('RMDir /r "$APPDATA\\${APP_FILENAME}"');
        expect(installerScript).toContain('RMDir /r "$LOCALAPPDATA\\${APP_FILENAME}"');
    });
});
