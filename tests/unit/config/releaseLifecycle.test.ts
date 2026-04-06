import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readWorkspaceFile(...segments: string[]): string {
    return readFileSync(path.resolve(process.cwd(), ...segments), 'utf8');
}

describe('release lifecycle configuration', () => {
    it('requires Windows signing secrets in the release workflow', () => {
        const workflow = readWorkspaceFile('.github', 'workflows', 'release-assets.yml');

        expect(workflow).toContain(
            'Windows signing secrets are required for self-signed Windows test releases.',
        );
        expect(workflow).toContain('WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}');
        expect(workflow).toContain('WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}');
        expect(workflow).toContain('Package macOS experimental artifacts');
    });

    it('documents Windows as self-signed internal test distribution and macOS as experimental without auto-update claims', () => {
        const readme = readWorkspaceFile('README.md');
        const deploymentGuide = readWorkspaceFile('docs', 'deployment.md');

        expect(readme).toContain('仅支持 Windows 内测分发');
        expect(readme).toContain('自签名 `.exe` 内测安装器');
        expect(readme).toContain('自签测试证书');
        expect(readme).toContain('不支持自动更新');
        expect(readme).toContain('macOS 构建会随 Release 一起上传');
        expect(readme).not.toContain('Linux');

        expect(deploymentGuide).toContain('Windows：唯一受支持的内测分发平台，自签名证书签名');
        expect(deploymentGuide).toContain('测试机安装前要求：');
        expect(deploymentGuide).toContain('macOS：实验性构建');
        expect(deploymentGuide).toContain('自动更新：当前未实现受支持的自动更新链路');
        expect(deploymentGuide).not.toContain('electron-updater');
        expect(deploymentGuide).not.toContain('Linux Ubuntu');
    });
});
