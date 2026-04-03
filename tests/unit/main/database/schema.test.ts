import fs from 'fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import DatabaseManager from '@/database/Database';
import { SchemaManager } from '@/database/schema';

class FakeSchemaDatabase {
  tables = new Set<string>();
  indexes = new Set<string>();
  rowCounts = new Map<string, number>();
  schemaVersion: string | undefined;
  droppedTables: string[] = [];
  droppedIndexes: string[] = [];

  prepare(sql: string) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized === "SELECT name FROM sqlite_master WHERE type='table' AND name='app_metadata'") {
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
        get: (tableName: string) => (this.tables.has(tableName) ? { name: tableName } : undefined),
      };
    }

    if (normalized === "SELECT name FROM sqlite_master WHERE type='index' AND name=?") {
      return {
        get: (indexName: string) => (this.indexes.has(indexName) ? { name: indexName } : undefined),
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
        get: () => ({ count: this.rowCounts.get(tableName) ?? 0 }),
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
}

describe('SchemaManager', () => {
  let db: FakeSchemaDatabase;

  beforeEach(() => {
    vi.restoreAllMocks();
    db = new FakeSchemaDatabase();
    vi.spyOn(DatabaseManager, 'getDatabase').mockReturnValue(db as never);
    vi.spyOn(DatabaseManager, 'exec').mockImplementation(() => undefined);
  });

  it('runs the initial migration when metadata is missing', async () => {
    vi.spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true)
      .mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('CREATE TABLE test;');

    await SchemaManager.initialize();

    expect(DatabaseManager.exec).toHaveBeenCalledWith('CREATE TABLE test;');
  });

  it('warns when the stored schema version does not match the current version', async () => {
    db.tables.add('app_metadata');
    db.schemaVersion = '2.0';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await SchemaManager.initialize();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Schema version mismatch'));
  });

  it('reads schema metadata and validates integrity statistics', () => {
    db.tables = new Set(['app_metadata', 'user_config']);
    db.indexes = new Set(['idx_user_config']);
    db.rowCounts.set('app_metadata', 1);
    db.rowCounts.set('user_config', 3);
    db.schemaVersion = '3.0';

    expect(SchemaManager.getVersion()).toBe('3.0');
    expect(SchemaManager.tableExists('user_config')).toBe(true);
    expect(SchemaManager.indexExists('idx_user_config')).toBe(true);
    expect(SchemaManager.getRowCount('user_config')).toBe(3);
    expect(SchemaManager.validateIntegrity()).toEqual({
      isValid: true,
      missingTables: [],
      missingIndexes: [],
    });
    expect(SchemaManager.getStatistics()).toEqual({
      version: '3.0',
      tables: {
        app_metadata: 1,
        user_config: 3,
      },
      totalItems: 0,
      totalEmails: 0,
      totalReports: 0,
    });
  });

  it('falls back to defaults when metadata is missing or row counts fail', () => {
    db.tables = new Set(['app_metadata']);
    db.schemaVersion = undefined;
    vi.spyOn(SchemaManager, 'getRowCount')
      .mockReturnValueOnce(0)
      .mockImplementationOnce(() => {
        throw new Error('missing table');
      });

    expect(SchemaManager.getVersion()).toBe('unknown');
    expect(SchemaManager.validateIntegrity()).toEqual({
      isValid: false,
      missingTables: ['user_config'],
      missingIndexes: [],
    });
    expect(SchemaManager.getStatistics()).toEqual({
      version: 'unknown',
      tables: {
        app_metadata: 0,
        user_config: 0,
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
