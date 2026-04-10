import fs from 'fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import DatabaseManager from '@/database/Database';
import { SchemaManager, SchemaMigrationError } from '@/database/schema';

const REQUIRED_TABLES = [
    'app_metadata',
    'user_config',
    'outlook_source_config',
    'extraction_runs',
    'discovered_pst_files',
    'processed_emails',
    'action_items',
    'item_evidence',
] as const;

const INITIAL_SQL = '-- initial schema';
const UPGRADE_SQL = '-- migrate 3.0 to 4.0';
const DB_PATH = 'C:\\Users\\tester\\AppData\\Roaming\\Maelor\\app.db';

class FakeSchemaDatabase {
    tables = new Set<string>();
    indexes = new Set<string>();
    rowCounts = new Map<string, number>();
    schemaVersion: string | undefined;
    droppedTables: string[] = [];
    droppedIndexes: string[] = [];
    executedSql: string[] = [];
    pragmaCalls: string[] = [];
    failOnSql: string | null = null;

    prepare(sql: string) {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (
            normalized ===
            "SELECT name FROM sqlite_master WHERE type='table' AND name='app_metadata'"
        ) {
            return {
                get: () => (this.tables.has('app_metadata') ? { name: 'app_metadata' } : undefined),
            };
        }

        if (normalized === 'SELECT value FROM app_metadata WHERE key = ?') {
            return {
                get: () => (this.schemaVersion ? { value: this.schemaVersion } : undefined),
            };
        }

        if (normalized === "SELECT name FROM sqlite_master WHERE type='table' AND name=?") {
            return {
                get: (tableName: string) =>
                    this.tables.has(tableName) ? { name: tableName } : undefined,
            };
        }

        if (normalized === "SELECT name FROM sqlite_master WHERE type='index' AND name=?") {
            return {
                get: (indexName: string) =>
                    this.indexes.has(indexName) ? { name: indexName } : undefined,
            };
        }

        if (normalized === "SELECT name FROM sqlite_master WHERE type='table'") {
            return {
                all: () => Array.from(this.tables).map((name) => ({ name })),
            };
        }

        if (normalized === "SELECT name FROM sqlite_master WHERE type='index'") {
            return {
                all: () => Array.from(this.indexes).map((name) => ({ name })),
            };
        }

        if (normalized.startsWith('SELECT COUNT(*) as count FROM ')) {
            const tableName = normalized.replace('SELECT COUNT(*) as count FROM ', '');
            return {
                get: () => {
                    if (!this.rowCounts.has(tableName)) {
                        throw new Error(`missing row count for ${tableName}`);
                    }

                    return { count: this.rowCounts.get(tableName) ?? 0 };
                },
            };
        }

        if (normalized.startsWith('DROP TABLE IF EXISTS ')) {
            const tableName = normalized.replace('DROP TABLE IF EXISTS ', '');
            return {
                run: () => {
                    this.droppedTables.push(tableName);
                    this.tables.delete(tableName);
                },
            };
        }

        if (normalized.startsWith('DROP INDEX IF EXISTS ')) {
            const indexName = normalized.replace('DROP INDEX IF EXISTS ', '');
            return {
                run: () => {
                    this.droppedIndexes.push(indexName);
                    this.indexes.delete(indexName);
                },
            };
        }

        throw new Error(`Unexpected SQL: ${normalized}`);
    }

    exec(sql: string): void {
        this.executedSql.push(sql);

        if (this.failOnSql && sql === this.failOnSql) {
            throw new Error('migration execution failed');
        }

        if (sql === INITIAL_SQL || sql === UPGRADE_SQL) {
            for (const table of REQUIRED_TABLES) {
                this.tables.add(table);
            }
            this.schemaVersion = '4.0';
        }
    }

    transaction(fn: () => void): () => void {
        return () => fn();
    }

    pragma(sql: string): void {
        this.pragmaCalls.push(sql);
    }
}

function mockFileSystem(options?: {
    includeInitial?: boolean;
    includeUpgrade?: boolean;
    dbFileExists?: boolean;
}): void {
    const includeInitial = options?.includeInitial ?? true;
    const includeUpgrade = options?.includeUpgrade ?? true;
    const dbFileExists = options?.dbFileExists ?? false;

    vi.spyOn(fs, 'existsSync').mockImplementation((target) => {
        const resolved = String(target);

        if (resolved.endsWith('001_initial_schema.sql')) {
            return includeInitial;
        }

        if (resolved.endsWith('002_upgrade_to_4_0.sql')) {
            return includeUpgrade;
        }

        if (resolved === DB_PATH) {
            return dbFileExists;
        }

        return false;
    });

    vi.spyOn(fs, 'readFileSync').mockImplementation((target) => {
        const resolved = String(target);

        if (resolved.endsWith('001_initial_schema.sql')) {
            return INITIAL_SQL;
        }

        if (resolved.endsWith('002_upgrade_to_4_0.sql')) {
            return UPGRADE_SQL;
        }

        throw new Error(`Unexpected file read: ${resolved}`);
    });
}

describe('SchemaManager', () => {
    let db: FakeSchemaDatabase;

    beforeEach(() => {
        vi.restoreAllMocks();
        db = new FakeSchemaDatabase();
        vi.spyOn(DatabaseManager, 'getDatabase').mockReturnValue(db as never);
        vi.spyOn(DatabaseManager, 'exec').mockImplementation((sql) => db.exec(sql));
        vi.spyOn(DatabaseManager, 'getPath').mockReturnValue(DB_PATH);
    });

    it('initializes a new database from the initial migration', async () => {
        mockFileSystem();

        const result = await SchemaManager.initialize();

        expect(result).toEqual({
            status: 'initialized',
            fromVersion: null,
            toVersion: '4.0',
            appliedMigrations: ['001_initial_schema.sql'],
            backupPath: null,
        });
        expect(DatabaseManager.exec).toHaveBeenCalledWith(INITIAL_SQL);
        expect(db.schemaVersion).toBe('4.0');
        expect(db.tables.has('processed_emails')).toBe(true);
    });

    it('returns up_to_date when the schema already matches the current version', async () => {
        db.tables = new Set(REQUIRED_TABLES);
        db.schemaVersion = '4.0';

        const result = await SchemaManager.initialize();

        expect(result).toEqual({
            status: 'up_to_date',
            fromVersion: '4.0',
            toVersion: '4.0',
            appliedMigrations: [],
            backupPath: null,
        });
    });

    it('migrates a 3.0 database to 4.0 after creating a backup', async () => {
        db.tables.add('app_metadata');
        db.schemaVersion = '3.0';
        mockFileSystem({ dbFileExists: true });
        const copyFileSync = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => undefined);
        vi.spyOn(Date, 'now').mockReturnValue(1712304000000);

        const result = await SchemaManager.initialize();

        expect(result).toEqual({
            status: 'migrated',
            fromVersion: '3.0',
            toVersion: '4.0',
            appliedMigrations: ['002_upgrade_to_4_0.sql'],
            backupPath: `${DB_PATH}.backup-3_0-to-4_0-1712304000000`,
        });
        expect(db.pragmaCalls).toEqual(['wal_checkpoint(TRUNCATE)']);
        expect(copyFileSync).toHaveBeenCalledWith(
            DB_PATH,
            `${DB_PATH}.backup-3_0-to-4_0-1712304000000`,
        );
        expect(db.executedSql).toContain(UPGRADE_SQL);
        expect(db.schemaVersion).toBe('4.0');
    });

    it('blocks startup when metadata exists but schema_version is missing', async () => {
        db.tables.add('app_metadata');

        await expect(SchemaManager.initialize()).rejects.toMatchObject({
            name: 'SchemaMigrationError',
            code: 'SCHEMA_VERSION_MISSING',
            toVersion: '4.0',
        });
    });

    it('blocks startup when the local database is newer than the app', async () => {
        db.tables.add('app_metadata');
        db.schemaVersion = '5.0';

        await expect(SchemaManager.initialize()).rejects.toMatchObject({
            name: 'SchemaMigrationError',
            code: 'SCHEMA_VERSION_AHEAD',
            fromVersion: '5.0',
            toVersion: '4.0',
        });
    });

    it('blocks startup when no sequential migration path exists', async () => {
        db.tables.add('app_metadata');
        db.schemaVersion = '2.0';

        await expect(SchemaManager.initialize()).rejects.toMatchObject({
            name: 'SchemaMigrationError',
            code: 'SCHEMA_MIGRATION_PATH_MISSING',
            fromVersion: '2.0',
            toVersion: '4.0',
            backupPath: null,
        });
    });

    it('keeps the backup path when migration execution fails', async () => {
        db.tables.add('app_metadata');
        db.schemaVersion = '3.0';
        db.failOnSql = UPGRADE_SQL;
        mockFileSystem({ dbFileExists: true });
        vi.spyOn(fs, 'copyFileSync').mockImplementation(() => undefined);
        vi.spyOn(Date, 'now').mockReturnValue(1712304000000);

        const failure = await SchemaManager.initialize().catch(
            (error) => error as SchemaMigrationError,
        );

        expect(failure).toBeInstanceOf(SchemaMigrationError);
        expect(failure.code).toBe('SCHEMA_MIGRATION_FAILED');
        expect(failure.backupPath).toBe(`${DB_PATH}.backup-3_0-to-4_0-1712304000000`);
        expect(failure.cause).toBeInstanceOf(Error);
    });

    it('reports integrity and statistics across the expanded schema surface', () => {
        db.tables = new Set(REQUIRED_TABLES);
        db.indexes = new Set(['idx_user_config']);
        db.schemaVersion = '4.0';
        db.rowCounts.set('app_metadata', 1);
        db.rowCounts.set('user_config', 2);
        db.rowCounts.set('outlook_source_config', 1);
        db.rowCounts.set('extraction_runs', 4);
        db.rowCounts.set('discovered_pst_files', 3);
        db.rowCounts.set('processed_emails', 9);
        db.rowCounts.set('action_items', 6);
        db.rowCounts.set('item_evidence', 12);

        expect(SchemaManager.getVersion()).toBe('4.0');
        expect(SchemaManager.tableExists('processed_emails')).toBe(true);
        expect(SchemaManager.indexExists('idx_user_config')).toBe(true);
        expect(SchemaManager.getRowCount('action_items')).toBe(6);
        expect(SchemaManager.validateIntegrity()).toEqual({
            isValid: true,
            missingTables: [],
            missingIndexes: [],
        });
        expect(SchemaManager.getStatistics()).toEqual({
            version: '4.0',
            tables: {
                app_metadata: 1,
                user_config: 2,
                outlook_source_config: 1,
                extraction_runs: 4,
                discovered_pst_files: 3,
                processed_emails: 9,
                action_items: 6,
                item_evidence: 12,
            },
            totalItems: 6,
            totalEmails: 9,
            totalReports: 4,
        });
    });

    it('falls back to defaults when tables or row counts are missing', () => {
        db.tables = new Set(['app_metadata']);

        expect(SchemaManager.getVersion()).toBe('unknown');
        expect(SchemaManager.validateIntegrity()).toEqual({
            isValid: false,
            missingTables: [
                'user_config',
                'outlook_source_config',
                'extraction_runs',
                'discovered_pst_files',
                'processed_emails',
                'action_items',
                'item_evidence',
            ],
            missingIndexes: [],
        });
        expect(SchemaManager.getStatistics()).toEqual({
            version: 'unknown',
            tables: {
                app_metadata: 0,
                user_config: 0,
                outlook_source_config: 0,
                extraction_runs: 0,
                discovered_pst_files: 0,
                processed_emails: 0,
                action_items: 0,
                item_evidence: 0,
            },
            totalItems: 0,
            totalEmails: 0,
            totalReports: 0,
        });
    });

    it('drops user tables and indexes during reset while keeping sqlite_sequence', () => {
        db.tables = new Set(['app_metadata', 'user_config', 'sqlite_sequence']);
        db.indexes = new Set(['idx_one', 'idx_two']);

        SchemaManager.reset();

        expect(db.droppedTables).toEqual(['app_metadata', 'user_config']);
        expect(db.droppedIndexes).toEqual(['idx_one', 'idx_two']);
    });
});
