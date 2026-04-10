import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('error handler user-facing dialogs', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;

    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        process.env.NODE_ENV = 'production';
        delete process.env.VITEST;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalVitest === undefined) {
            delete process.env.VITEST;
        } else {
            process.env.VITEST = originalVitest;
        }
    });

    it('shows a readable startup dialog for schema migration failures', async () => {
        const showErrorBox = vi.fn();
        const logger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        vi.doMock('electron', () => ({
            app: {
                exit: vi.fn(),
                isReady: vi.fn(() => true),
            },
            BrowserWindow: vi.fn(),
            dialog: {
                showErrorBox,
            },
        }));
        vi.doMock('@/config/logger', () => ({ logger }));

        const { errorHandler } = await import('@/error-handler');
        const { SchemaMigrationError } = await import('@/database/schema');

        errorHandler.showFatalStartupDialog(
            new SchemaMigrationError(
                'SCHEMA_MIGRATION_FAILED',
                '数据库从 3.0 升级到 4.0 失败，应用已停止启动。',
                {
                    fromVersion: '3.0',
                    toVersion: '4.0',
                    backupPath: 'C:\\backup\\app.db.backup',
                },
            ),
        );

        expect(showErrorBox).toHaveBeenCalledWith('Maelor 启动失败', expect.any(String));
        const message = showErrorBox.mock.calls[0][1] as string;
        expect(message).toContain('应用无法完成本地数据库升级，已停止启动以保护现有数据。');
        expect(message).toContain('先不要手动删除数据库文件');
        expect(message).toContain('数据库备份位置：C:\\backup\\app.db.backup');
    });

    it('shows readable runtime dialogs for critical database errors', async () => {
        const showErrorBox = vi.fn();
        const logger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };

        vi.doMock('electron', () => ({
            app: {
                exit: vi.fn(),
                isReady: vi.fn(() => true),
            },
            BrowserWindow: vi.fn(),
            dialog: {
                showErrorBox,
            },
        }));
        vi.doMock('@/config/logger', () => ({ logger }));

        const { errorHandler, ErrorCategory } = await import('@/error-handler');

        errorHandler.setMainWindow({} as never);
        errorHandler.reportError(
            new Error('database unavailable'),
            ErrorCategory.DATABASE,
            'MainProcess',
        );

        expect(showErrorBox).toHaveBeenCalledWith('Maelor 错误', expect.any(String));
        const message = showErrorBox.mock.calls[0][1] as string;
        expect(message).toContain('数据库出现错误，部分功能暂时不可用。');
        expect(message).toContain('如果问题持续存在，请重启应用后重试。');
    });
});
