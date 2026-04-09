import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

class DatabaseManager {
    private static instance: Database.Database | null = null;
    private static dbPath = '';

    static initialize(): Database.Database {
        if (this.instance) {
            return this.instance;
        }

        const userDataPath = app.getPath('userData');
        const dataDir = path.join(userDataPath, '.maelor');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.dbPath = path.join(dataDir, 'app.db');
        this.instance = new Database(this.dbPath, {
            verbose: process.env.LOG_LEVEL === 'DEBUG' ? console.log : undefined,
        });

        this.instance.pragma('journal_mode = WAL');
        this.instance.pragma('synchronous = NORMAL');
        this.instance.pragma('foreign_keys = ON');
        this.instance.pragma('temp_store = MEMORY');
        this.instance.pragma('mmap_size = 30000000000');
        this.instance.pragma('page_size = 4096');
        this.instance.pragma('cache_size = -64000');

        return this.instance;
    }

    static getDatabase(): Database.Database {
        if (!this.instance) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        return this.instance;
    }

    static setInstanceForTesting(db: Database.Database): void {
        this.instance = db;
    }

    static resetInstanceForTesting(): void {
        this.instance = null;
    }

    static close(): void {
        if (this.instance) {
            this.instance.close();
            this.instance = null;
        }
    }

    static transaction<T>(fn: (db: Database.Database) => T): T {
        const db = this.getDatabase();
        const transaction = db.transaction(fn);
        return transaction(db);
    }

    static prepare(sql: string): Database.Statement {
        return this.getDatabase().prepare(sql);
    }

    static exec(sql: string): void {
        this.getDatabase().exec(sql);
    }

    static getPath(): string {
        return this.dbPath ?? '';
    }

    static exists(): boolean {
        return this.instance !== null && fs.existsSync(this.dbPath);
    }

    static getSize(): number {
        if (!fs.existsSync(this.dbPath)) {
            return 0;
        }

        return fs.statSync(this.dbPath).size;
    }

    static vacuum(): void {
        const db = this.getDatabase();
        db.pragma('wal_checkpoint(TRUNCATE)');
        db.exec('VACUUM');
    }
}

export default DatabaseManager;
