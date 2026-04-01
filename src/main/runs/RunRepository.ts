import { randomUUID } from 'crypto';

import type { MvpActionItemView, MvpEvidenceView, MvpRunDetail, MvpRunSummary, MvpValidationFile } from '@shared/types/mvp.js';

import { ConfigManager } from '../config/ConfigManager.js';
import DatabaseManager from '../database/Database.js';

const OUTLOOK_DIRECTORY_KEY = 'mvp.outlook.directory';
const AI_BASE_URL_KEY = 'mvp.ai.baseUrl';
const AI_MODEL_KEY = 'mvp.ai.model';

export class RunRepository {
  private static schemaReady = false;

  private static ensureSchema(): void {
    if (this.schemaReady) {
      return;
    }

    const db = DatabaseManager.getDatabase();

    db.exec(`
      CREATE TABLE IF NOT EXISTS outlook_source_config (
        source_id TEXT PRIMARY KEY,
        directory_path TEXT NOT NULL,
        last_validated_at INTEGER,
        last_validation_status TEXT,
        last_validation_message TEXT
      );

      CREATE TABLE IF NOT EXISTS extraction_runs (
        run_id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        status TEXT NOT NULL,
        pst_count INTEGER NOT NULL,
        processed_email_count INTEGER NOT NULL,
        item_count INTEGER NOT NULL,
        low_confidence_count INTEGER NOT NULL,
        outlook_directory TEXT NOT NULL,
        message TEXT NOT NULL,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS discovered_pst_files (
        pst_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        absolute_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        modified_at INTEGER NOT NULL,
        readability TEXT NOT NULL,
        readability_reason TEXT,
        FOREIGN KEY (run_id) REFERENCES extraction_runs(run_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS processed_emails (
        email_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        pst_id TEXT,
        message_identifier TEXT,
        fingerprint TEXT,
        sender_display TEXT,
        sender_address TEXT,
        subject TEXT,
        sent_at INTEGER,
        file_path_hint TEXT,
        FOREIGN KEY (run_id) REFERENCES extraction_runs(run_id) ON DELETE CASCADE,
        FOREIGN KEY (pst_id) REFERENCES discovered_pst_files(pst_id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS action_items (
        item_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        item_type TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        confidence_level TEXT NOT NULL,
        source_status TEXT NOT NULL,
        rationale TEXT NOT NULL,
        sender_display TEXT NOT NULL,
        sent_at INTEGER,
        subject_snippet TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES extraction_runs(run_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS item_evidence (
        evidence_id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        email_id TEXT,
        sender_display TEXT NOT NULL,
        subject_snippet TEXT NOT NULL,
        sent_at INTEGER,
        search_term TEXT NOT NULL,
        file_path TEXT NOT NULL,
        source_identifier TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES action_items(item_id) ON DELETE CASCADE,
        FOREIGN KEY (email_id) REFERENCES processed_emails(email_id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_extraction_runs_started_at ON extraction_runs(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_discovered_pst_files_run_id ON discovered_pst_files(run_id);
      CREATE INDEX IF NOT EXISTS idx_action_items_run_id ON action_items(run_id);
      CREATE INDEX IF NOT EXISTS idx_item_evidence_item_id ON item_evidence(item_id);
    `);

    this.schemaReady = true;
  }

  static async saveRun(run: MvpRunDetail): Promise<void> {
    this.ensureSchema();

    DatabaseManager.transaction((db) => {
      db.prepare('DELETE FROM extraction_runs WHERE run_id = ?').run(run.runId);

      db.prepare(`
        INSERT INTO extraction_runs (
          run_id,
          started_at,
          finished_at,
          status,
          pst_count,
          processed_email_count,
          item_count,
          low_confidence_count,
          outlook_directory,
          message,
          error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        run.runId,
        run.startedAt,
        run.finishedAt,
        run.status,
        run.pstCount,
        run.processedEmailCount,
        run.itemCount,
        run.lowConfidenceCount,
        run.outlookDirectory,
        run.message,
        null,
      );

      const insertPst = db.prepare(`
        INSERT INTO discovered_pst_files (
          pst_id,
          run_id,
          absolute_path,
          file_name,
          file_size_bytes,
          modified_at,
          readability,
          readability_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const file of run.pstFiles) {
        insertPst.run(
          randomUUID(),
          run.runId,
          file.path,
          file.fileName,
          file.sizeBytes,
          file.modifiedAt,
          file.readability,
          file.reason,
        );
      }

      const insertItem = db.prepare(`
        INSERT INTO action_items (
          item_id,
          run_id,
          title,
          content,
          item_type,
          confidence_score,
          confidence_level,
          source_status,
          rationale,
          sender_display,
          sent_at,
          subject_snippet
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertEvidence = db.prepare(`
        INSERT INTO item_evidence (
          evidence_id,
          item_id,
          email_id,
          sender_display,
          subject_snippet,
          sent_at,
          search_term,
          file_path,
          source_identifier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of run.items) {
        insertItem.run(
          item.itemId,
          run.runId,
          item.title,
          item.content,
          item.itemType,
          item.confidenceScore,
          item.confidenceLevel,
          item.sourceStatus,
          item.rationale,
          item.senderDisplay,
          item.sentAt,
          item.subjectSnippet,
        );

        for (const evidence of item.evidence) {
          insertEvidence.run(
            evidence.evidenceId,
            item.itemId,
            null,
            evidence.senderDisplay,
            evidence.subjectSnippet,
            evidence.sentAt,
            evidence.searchTerm,
            evidence.filePath,
            evidence.sourceIdentifier,
          );
        }
      }
    });
  }

  static async clearRuns(): Promise<number> {
    this.ensureSchema();

    const db = DatabaseManager.getDatabase();
    const current = db.prepare('SELECT COUNT(*) AS count FROM extraction_runs').get() as { count: number };

    DatabaseManager.transaction((tx) => {
      tx.prepare('DELETE FROM item_evidence').run();
      tx.prepare('DELETE FROM action_items').run();
      tx.prepare('DELETE FROM processed_emails').run();
      tx.prepare('DELETE FROM discovered_pst_files').run();
      tx.prepare('DELETE FROM extraction_runs').run();
    });

    return current.count;
  }

  static async getLatest(): Promise<MvpRunDetail | null> {
    this.ensureSchema();

    const db = DatabaseManager.getDatabase();
    const latest = db.prepare('SELECT run_id FROM extraction_runs ORDER BY started_at DESC LIMIT 1').get() as
      | { run_id: string }
      | undefined;

    if (!latest) {
      return null;
    }

    return this.getById(latest.run_id);
  }

  static async getById(runId: string): Promise<MvpRunDetail | null> {
    this.ensureSchema();

    const db = DatabaseManager.getDatabase();
    const row = db.prepare(`
      SELECT
        run_id,
        started_at,
        finished_at,
        status,
        pst_count,
        processed_email_count,
        item_count,
        low_confidence_count,
        outlook_directory,
        message
      FROM extraction_runs
      WHERE run_id = ?
    `).get(runId) as
      | {
          run_id: string;
          started_at: number;
          finished_at: number | null;
          status: MvpRunDetail['status'];
          pst_count: number;
          processed_email_count: number;
          item_count: number;
          low_confidence_count: number;
          outlook_directory: string;
          message: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    const pstFiles = db.prepare(`
      SELECT
        absolute_path,
        file_name,
        file_size_bytes,
        modified_at,
        readability,
        readability_reason
      FROM discovered_pst_files
      WHERE run_id = ?
      ORDER BY file_name ASC
    `).all(runId) as Array<{
      absolute_path: string;
      file_name: string;
      file_size_bytes: number;
      modified_at: number;
      readability: MvpValidationFile['readability'];
      readability_reason: string | null;
    }>;

    const itemRows = db.prepare(`
      SELECT
        item_id,
        title,
        content,
        item_type,
        confidence_score,
        confidence_level,
        source_status,
        rationale,
        sender_display,
        sent_at,
        subject_snippet
      FROM action_items
      WHERE run_id = ?
      ORDER BY sent_at DESC, item_id ASC
    `).all(runId) as Array<{
      item_id: string;
      title: string;
      content: string;
      item_type: MvpActionItemView['itemType'];
      confidence_score: number;
      confidence_level: MvpActionItemView['confidenceLevel'];
      source_status: MvpActionItemView['sourceStatus'];
      rationale: string;
      sender_display: string;
      sent_at: number | null;
      subject_snippet: string;
    }>;

    const evidenceRows = db.prepare(`
      SELECT
        evidence_id,
        item_id,
        sender_display,
        subject_snippet,
        sent_at,
        search_term,
        file_path,
        source_identifier
      FROM item_evidence
      WHERE item_id IN (SELECT item_id FROM action_items WHERE run_id = ?)
      ORDER BY item_id ASC, evidence_id ASC
    `).all(runId) as Array<{
      evidence_id: string;
      item_id: string;
      sender_display: string;
      subject_snippet: string;
      sent_at: number | null;
      search_term: string;
      file_path: string;
      source_identifier: string;
    }>;

    const evidenceByItem = new Map<string, MvpEvidenceView[]>();
    for (const evidence of evidenceRows) {
      const current = evidenceByItem.get(evidence.item_id) ?? [];
      current.push({
        evidenceId: evidence.evidence_id,
        senderDisplay: evidence.sender_display,
        subjectSnippet: evidence.subject_snippet,
        sentAt: evidence.sent_at,
        searchTerm: evidence.search_term,
        filePath: evidence.file_path,
        sourceIdentifier: evidence.source_identifier,
      });
      evidenceByItem.set(evidence.item_id, current);
    }

    return {
      runId: row.run_id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      pstCount: row.pst_count,
      processedEmailCount: row.processed_email_count,
      itemCount: row.item_count,
      lowConfidenceCount: row.low_confidence_count,
      outlookDirectory: row.outlook_directory,
      message: row.message,
      pstFiles: pstFiles.map((file) => ({
        path: file.absolute_path,
        fileName: file.file_name,
        sizeBytes: file.file_size_bytes,
        modifiedAt: file.modified_at,
        readability: file.readability,
        reason: file.readability_reason,
      })),
      items: itemRows.map((item) => ({
        itemId: item.item_id,
        title: item.title,
        content: item.content,
        itemType: item.item_type,
        confidenceScore: item.confidence_score,
        confidenceLevel: item.confidence_level,
        sourceStatus: item.source_status,
        rationale: item.rationale,
        senderDisplay: item.sender_display,
        sentAt: item.sent_at,
        subjectSnippet: item.subject_snippet,
        evidence: evidenceByItem.get(item.item_id) ?? [],
      })),
    };
  }

  static async listRecent(limit = 20): Promise<MvpRunSummary[]> {
    this.ensureSchema();

    const db = DatabaseManager.getDatabase();
    const rows = db.prepare(`
      SELECT
        run_id,
        started_at,
        finished_at,
        status,
        pst_count,
        processed_email_count,
        item_count,
        low_confidence_count
      FROM extraction_runs
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit) as Array<{
      run_id: string;
      started_at: number;
      finished_at: number | null;
      status: MvpRunSummary['status'];
      pst_count: number;
      processed_email_count: number;
      item_count: number;
      low_confidence_count: number;
    }>;

    return rows.map((row) => ({
      runId: row.run_id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      pstCount: row.pst_count,
      processedEmailCount: row.processed_email_count,
      itemCount: row.item_count,
      lowConfidenceCount: row.low_confidence_count,
    }));
  }

  static async createEmptyRun(pstFiles: MvpValidationFile[], outlookDirectory: string): Promise<MvpRunDetail> {
    const startedAt = Date.now();
    const readablePstCount = pstFiles.filter((file) => file.readability === 'readable').length;

    return {
      runId: randomUUID(),
      startedAt,
      finishedAt: null,
      status: 'pending',
      pstCount: readablePstCount,
      processedEmailCount: 0,
      itemCount: 0,
      lowConfidenceCount: 0,
      outlookDirectory,
      pstFiles,
      items: [],
      message:
        pstFiles.length > 0
          ? 'PST 发现已完成，邮件解析与事项提取链路尚未接入。'
          : '未发现 PST 文件。',
    };
  }

  static async getSettingsSeed(): Promise<{
    outlookDirectory: string;
    aiBaseUrl: string;
    aiModel: string;
  }> {
    const config = await ConfigManager.get([
      OUTLOOK_DIRECTORY_KEY,
      AI_BASE_URL_KEY,
      AI_MODEL_KEY,
    ]);

    return {
      outlookDirectory:
        typeof config[OUTLOOK_DIRECTORY_KEY] === 'string' ? (config[OUTLOOK_DIRECTORY_KEY] as string) : '',
      aiBaseUrl: typeof config[AI_BASE_URL_KEY] === 'string' ? (config[AI_BASE_URL_KEY] as string) : '',
      aiModel: typeof config[AI_MODEL_KEY] === 'string' ? (config[AI_MODEL_KEY] as string) : '',
    };
  }
}

export const MVP_CONFIG_KEYS = {
  outlookDirectory: OUTLOOK_DIRECTORY_KEY,
  aiBaseUrl: AI_BASE_URL_KEY,
  aiModel: AI_MODEL_KEY,
} as const;

export default RunRepository;
