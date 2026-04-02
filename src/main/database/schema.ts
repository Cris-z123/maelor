import DatabaseManager from './Database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INITIAL_MIGRATION = '001_initial_schema.sql';

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

export class SchemaManager {
  private static readonly CURRENT_SCHEMA_VERSION = '3.0';

  static async initialize(): Promise<void> {
    const db = DatabaseManager.getDatabase();
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_metadata'")
      .get() as { name: string } | undefined;

    if (!tableExists) {
      await this.runInitialSchema();
      return;
    }

    const schemaVersion = db
      .prepare('SELECT value FROM app_metadata WHERE key = ?')
      .get('schema_version') as { value: string } | undefined;

    if (schemaVersion?.value !== this.CURRENT_SCHEMA_VERSION) {
      console.warn(
        `Schema version mismatch: expected ${this.CURRENT_SCHEMA_VERSION}, got ${schemaVersion?.value ?? 'unknown'}`
      );
    }
  }

  private static async runInitialSchema(): Promise<void> {
    const migrationPath = path.join(getMigrationsDir(), INITIAL_MIGRATION);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    DatabaseManager.exec(fs.readFileSync(migrationPath, 'utf-8'));
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
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    return result.count;
  }

  static validateIntegrity(): {
    isValid: boolean;
    missingTables: string[];
    missingIndexes: string[];
  } {
    const requiredTables = ['app_metadata', 'user_config'];
    const missingTables = requiredTables.filter((table) => !this.tableExists(table));

    return {
      isValid: missingTables.length === 0,
      missingTables,
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

    for (const table of ['app_metadata', 'user_config']) {
      try {
        tables[table] = this.getRowCount(table);
      } catch {
        tables[table] = 0;
      }
    }

    return {
      version: this.getVersion(),
      tables,
      totalItems: 0,
      totalEmails: 0,
      totalReports: 0,
    };
  }

  static reset(): void {
    const db = DatabaseManager.getDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;

    for (const table of tables) {
      if (table.name !== 'sqlite_sequence') {
        db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
      }
    }

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>;
    for (const index of indexes) {
      db.prepare(`DROP INDEX IF EXISTS ${index.name}`).run();
    }
  }
}

export default SchemaManager;
