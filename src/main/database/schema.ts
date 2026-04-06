import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import DatabaseManager from './Database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INITIAL_MIGRATION = '001_initial_schema.sql';

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

const MIGRATIONS = [
    {
        from: '3.0',
        to: '4.0',
        file: '002_upgrade_to_4_0.sql',
    },
] as const;

export type SchemaInitializationResult =
    | {
          status: 'initialized';
          fromVersion: null;
          toVersion: string;
          appliedMigrations: string[];
          backupPath: null;
      }
    | {
          status: 'up_to_date';
          fromVersion: string;
          toVersion: string;
          appliedMigrations: string[];
          backupPath: null;
      }
    | {
          status: 'migrated';
          fromVersion: string;
          toVersion: string;
          appliedMigrations: string[];
          backupPath: string | null;
      };

export class SchemaMigrationError extends Error {
    readonly code:
        | 'SCHEMA_VERSION_MISSING'
        | 'SCHEMA_VERSION_AHEAD'
        | 'SCHEMA_MIGRATION_PATH_MISSING'
        | 'SCHEMA_BACKUP_FAILED'
        | 'SCHEMA_MIGRATION_FILE_MISSING'
        | 'SCHEMA_MIGRATION_FAILED';
    readonly fromVersion: string | null;
    readonly toVersion: string;
    readonly backupPath: string | null;

    constructor(
        code: SchemaMigrationError['code'],
        message: string,
        options: {
            fromVersion?: string | null;
            toVersion: string;
            backupPath?: string | null;
            cause?: unknown;
        },
    ) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = 'SchemaMigrationError';
        this.code = code;
        this.fromVersion = options.fromVersion ?? null;
        this.toVersion = options.toVersion;
        this.backupPath = options.backupPath ?? null;
    }
}

function getMigrationsDir(): string {
    const srcDir = path.join(process.cwd(), 'src', 'main', 'database', 'migrations');
    if (fs.existsSync(path.join(srcDir, INITIAL_MIGRATION))) {
        return srcDir;
    }

    const distDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(path.join(distDir, INITIAL_MIGRATION))) {
        return distDir;
    }

    return distDir;
}

function toNumericVersion(version: string): number {
    const parsed = Number(version);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export class SchemaManager {
    private static readonly CURRENT_SCHEMA_VERSION = '4.0';

    static async initialize(): Promise<SchemaInitializationResult> {
        const db = DatabaseManager.getDatabase();
        const tableExists = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_metadata'")
            .get() as { name: string } | undefined;

        if (!tableExists) {
            await this.runInitialSchema();
            return {
                status: 'initialized',
                fromVersion: null,
                toVersion: this.CURRENT_SCHEMA_VERSION,
                appliedMigrations: [INITIAL_MIGRATION],
                backupPath: null,
            };
        }

        const schemaVersion = db
            .prepare('SELECT value FROM app_metadata WHERE key = ?')
            .get('schema_version') as { value: string } | undefined;

        if (!schemaVersion?.value) {
            throw new SchemaMigrationError(
                'SCHEMA_VERSION_MISSING',
                '检测到数据库元数据存在，但缺少 schema_version，应用已阻止继续启动。',
                { toVersion: this.CURRENT_SCHEMA_VERSION },
            );
        }

        if (schemaVersion.value === this.CURRENT_SCHEMA_VERSION) {
            return {
                status: 'up_to_date',
                fromVersion: schemaVersion.value,
                toVersion: this.CURRENT_SCHEMA_VERSION,
                appliedMigrations: [],
                backupPath: null,
            };
        }

        const currentVersionNumber = toNumericVersion(this.CURRENT_SCHEMA_VERSION);
        const storedVersionNumber = toNumericVersion(schemaVersion.value);
        if (!Number.isNaN(storedVersionNumber) && storedVersionNumber > currentVersionNumber) {
            throw new SchemaMigrationError(
                'SCHEMA_VERSION_AHEAD',
                `本地数据库版本 ${schemaVersion.value} 高于当前应用支持的 ${this.CURRENT_SCHEMA_VERSION}，请使用更新的应用版本打开数据。`,
                {
                    fromVersion: schemaVersion.value,
                    toVersion: this.CURRENT_SCHEMA_VERSION,
                },
            );
        }

        return this.applyMigrations(schemaVersion.value);
    }

    private static async runInitialSchema(): Promise<void> {
        const migrationPath = path.join(getMigrationsDir(), INITIAL_MIGRATION);

        if (!fs.existsSync(migrationPath)) {
            throw new SchemaMigrationError(
                'SCHEMA_MIGRATION_FILE_MISSING',
                `初始化数据库失败，缺少迁移文件：${migrationPath}`,
                { toVersion: this.CURRENT_SCHEMA_VERSION },
            );
        }

        DatabaseManager.exec(fs.readFileSync(migrationPath, 'utf8'));
    }

    private static applyMigrations(fromVersion: string): SchemaInitializationResult {
        const appliedMigrations: string[] = [];
        let currentVersion = fromVersion;
        let backupPath: string | null = null;

        while (currentVersion !== this.CURRENT_SCHEMA_VERSION) {
            const migration = MIGRATIONS.find((entry) => entry.from === currentVersion);
            if (!migration) {
                throw new SchemaMigrationError(
                    'SCHEMA_MIGRATION_PATH_MISSING',
                    `未找到从 ${currentVersion} 升级到 ${this.CURRENT_SCHEMA_VERSION} 的数据库迁移路径。`,
                    {
                        fromVersion: currentVersion,
                        toVersion: this.CURRENT_SCHEMA_VERSION,
                        backupPath,
                    },
                );
            }

            if (!backupPath) {
                backupPath = this.createBackup(fromVersion, this.CURRENT_SCHEMA_VERSION);
            }

            this.runMigrationFile(migration.file, migration.from, migration.to, backupPath);
            appliedMigrations.push(migration.file);
            currentVersion = migration.to;
        }

        return {
            status: 'migrated',
            fromVersion,
            toVersion: this.CURRENT_SCHEMA_VERSION,
            appliedMigrations,
            backupPath,
        };
    }

    private static createBackup(fromVersion: string, toVersion: string): string | null {
        const db = DatabaseManager.getDatabase() as {
            pragma?: (sql: string) => unknown;
        };
        db.pragma?.('wal_checkpoint(TRUNCATE)');

        const dbPath = DatabaseManager.getPath();
        if (!dbPath || !fs.existsSync(dbPath)) {
            return null;
        }

        const backupPath = `${dbPath}.backup-${fromVersion.replace(/\./g, '_')}-to-${toVersion.replace(/\./g, '_')}-${Date.now()}`;
        try {
            fs.copyFileSync(dbPath, backupPath);
            return backupPath;
        } catch (error) {
            throw new SchemaMigrationError(
                'SCHEMA_BACKUP_FAILED',
                `创建数据库备份失败，已取消升级。原数据库位置：${dbPath}`,
                {
                    fromVersion,
                    toVersion,
                    cause: error,
                },
            );
        }
    }

    private static runMigrationFile(
        fileName: string,
        fromVersion: string,
        toVersion: string,
        backupPath: string | null,
    ): void {
        const migrationPath = path.join(getMigrationsDir(), fileName);
        if (!fs.existsSync(migrationPath)) {
            throw new SchemaMigrationError(
                'SCHEMA_MIGRATION_FILE_MISSING',
                `升级数据库失败，缺少迁移文件：${migrationPath}`,
                {
                    fromVersion,
                    toVersion,
                    backupPath,
                },
            );
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');
        const db = DatabaseManager.getDatabase() as {
            exec: (statement: string) => void;
            transaction: (fn: () => void) => () => void;
        };

        try {
            const migrate = db.transaction(() => {
                db.exec(sql);
            });
            migrate();
        } catch (error) {
            throw new SchemaMigrationError(
                'SCHEMA_MIGRATION_FAILED',
                `数据库从 ${fromVersion} 升级到 ${toVersion} 失败，应用已停止启动。`,
                {
                    fromVersion,
                    toVersion,
                    backupPath,
                    cause: error,
                },
            );
        }
    }

    static getVersion(): string {
        const db = DatabaseManager.getDatabase();
        const result = db
            .prepare('SELECT value FROM app_metadata WHERE key = ?')
            .get('schema_version') as { value: string } | undefined;

        return result?.value || 'unknown';
    }

    static tableExists(tableName: string): boolean {
        const db = DatabaseManager.getDatabase();
        const result = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
            .get(tableName) as { name: string } | undefined;

        return !!result;
    }

    static indexExists(indexName: string): boolean {
        const db = DatabaseManager.getDatabase();
        const result = db
            .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?")
            .get(indexName) as { name: string } | undefined;

        return !!result;
    }

    static getRowCount(tableName: string): number {
        const db = DatabaseManager.getDatabase();
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as {
            count: number;
        };
        return result.count;
    }

    static validateIntegrity(): {
        isValid: boolean;
        missingTables: string[];
        missingIndexes: string[];
    } {
        const missingTables = REQUIRED_TABLES.filter((table) => !this.tableExists(table));

        return {
            isValid: missingTables.length === 0,
            missingTables: [...missingTables],
            missingIndexes: [],
        };
    }

    static getStatistics(): {
        version: string;
        tables: Record<string, number>;
        totalItems: number;
        totalEmails: number;
        totalReports: number;
    } {
        const tables: Record<string, number> = {};

        for (const table of REQUIRED_TABLES) {
            try {
                tables[table] = this.getRowCount(table);
            } catch {
                tables[table] = 0;
            }
        }

        return {
            version: this.getVersion(),
            tables,
            totalItems: tables.action_items ?? 0,
            totalEmails: tables.processed_emails ?? 0,
            totalReports: tables.extraction_runs ?? 0,
        };
    }

    static reset(): void {
        const db = DatabaseManager.getDatabase();
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .all() as Array<{
            name: string;
        }>;

        for (const table of tables) {
            if (table.name !== 'sqlite_sequence') {
                db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
            }
        }

        const indexes = db
            .prepare("SELECT name FROM sqlite_master WHERE type='index'")
            .all() as Array<{
            name: string;
        }>;
        for (const index of indexes) {
            db.prepare(`DROP INDEX IF EXISTS ${index.name}`).run();
        }
    }
}

export default SchemaManager;
