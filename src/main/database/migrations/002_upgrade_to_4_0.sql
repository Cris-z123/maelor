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
CREATE INDEX IF NOT EXISTS idx_processed_emails_run_id ON processed_emails(run_id);
CREATE INDEX IF NOT EXISTS idx_action_items_run_id ON action_items(run_id);
CREATE INDEX IF NOT EXISTS idx_item_evidence_item_id ON item_evidence(item_id);

UPDATE app_metadata
SET value = '4.0', updated_at = strftime('%s', 'now')
WHERE key = 'schema_version';
