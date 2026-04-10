import fs from 'fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { databaseCtor } = vi.hoisted(() => ({
    databaseCtor: vi.fn(),
}));

vi.mock('better-sqlite3', () => ({
    default: databaseCtor,
}));

import { app } from 'electron';

import DatabaseManager from '@/database/Database';

type FakeDb = {
    pragma: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
};

function createFakeDb(): FakeDb {
    return {
        pragma: vi.fn(),
        transaction: vi.fn((fn: (db: FakeDb) => unknown) => (db: FakeDb) => fn(db)),
        prepare: vi.fn((sql: string) => ({ sql })),
        exec: vi.fn(),
        close: vi.fn(),
    };
}

describe('DatabaseManager', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        DatabaseManager.resetInstanceForTesting();
        (DatabaseManager as unknown as { dbPath: string }).dbPath = '';
        delete process.env.LOG_LEVEL;
    });

    it('initializes the sqlite database and configures pragmas', () => {
        const fakeDb = createFakeDb();
        process.env.LOG_LEVEL = 'DEBUG';
        vi.spyOn(app, 'getPath').mockReturnValue('D:\\userData');
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
        databaseCtor.mockReturnValue(fakeDb);

        const db = DatabaseManager.initialize();

        expect(db).toBe(fakeDb);
        expect(fs.mkdirSync).toHaveBeenCalledWith('D:\\userData\\.maelor', {
            recursive: true,
        });
        expect(databaseCtor).toHaveBeenCalledWith('D:\\userData\\.maelor\\app.db', {
            verbose: console.log,
        });
        expect(fakeDb.pragma).toHaveBeenCalledWith('journal_mode = WAL');
        expect(fakeDb.pragma).toHaveBeenCalledWith('cache_size = -64000');
        expect(DatabaseManager.getPath()).toBe('D:\\userData\\.maelor\\app.db');
    });

    it('reuses the existing instance and exposes helper methods', () => {
        const fakeDb = createFakeDb();
        DatabaseManager.setInstanceForTesting(fakeDb as never);
        (DatabaseManager as unknown as { dbPath: string }).dbPath =
            'D:\\userData\\.maelor\\app.db';
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'statSync').mockReturnValue({ size: 512 } as fs.Stats);

        expect(DatabaseManager.initialize()).toBe(fakeDb);
        expect(DatabaseManager.getDatabase()).toBe(fakeDb);
        expect(DatabaseManager.prepare('SELECT 1')).toEqual({ sql: 'SELECT 1' });
        DatabaseManager.exec('VACUUM');
        expect(fakeDb.exec).toHaveBeenCalledWith('VACUUM');
        expect(DatabaseManager.exists()).toBe(true);
        expect(DatabaseManager.getSize()).toBe(512);
    });

    it('throws when the database has not been initialized', () => {
        expect(DatabaseManager.getPath()).toBe('');
        expect(() => DatabaseManager.getDatabase()).toThrow('Database not initialized');
    });

    it('runs transactional helpers, vacuum, and closes the connection', () => {
        const fakeDb = createFakeDb();
        DatabaseManager.setInstanceForTesting(fakeDb as never);

        const result = DatabaseManager.transaction((db) => {
            expect(db).toBe(fakeDb);
            return 'ok';
        });

        expect(result).toBe('ok');
        DatabaseManager.vacuum();
        expect(fakeDb.pragma).toHaveBeenCalledWith('wal_checkpoint(TRUNCATE)');
        expect(fakeDb.exec).toHaveBeenCalledWith('VACUUM');

        DatabaseManager.close();
        expect(fakeDb.close).toHaveBeenCalledOnce();
        expect(() => DatabaseManager.getDatabase()).toThrow('Database not initialized');
    });

    it('returns zero size when the database file does not exist and clears the test instance', () => {
        const fakeDb = createFakeDb();
        DatabaseManager.setInstanceForTesting(fakeDb as never);
        (DatabaseManager as unknown as { dbPath: string }).dbPath = 'D:\\missing.db';
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);

        expect(DatabaseManager.exists()).toBe(false);
        expect(DatabaseManager.getSize()).toBe(0);

        DatabaseManager.resetInstanceForTesting();
        expect(() => DatabaseManager.getDatabase()).toThrow('Database not initialized');
    });
});
