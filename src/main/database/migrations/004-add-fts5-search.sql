-- ===================================================================
-- Migration 004: FTS5 Full-Text Search for Historical Reports
-- Per plan.md T010, research.md decision #4
-- ===================================================================
--
-- Design Decision:
-- Since todo_items.content_encrypted contains encrypted data, we cannot
-- directly index it with FTS5. Instead, we create a separate search table
-- that is populated during report generation when data is already decrypted
-- in memory. This maintains security while enabling fast search.
--
-- Application layer responsibility:
-- - During report generation, decrypt content and populate todo_items_fts
-- - Update search index when items are modified
-- - Keep FTS index in sync with todo_items
-- ===================================================================

-- Create FTS5 virtual table for fast full-text search
-- Supports searching across 10k+ items in <1 second (per SC-011)
CREATE VIRTUAL TABLE IF NOT EXISTS todo_items_fts USING fts5(
    title,
    description,
    item_id,
    source_email_subject,
    source_email_sender
);

-- Create index table to track which items are in FTS index
-- This allows efficient incremental updates
CREATE TABLE IF NOT EXISTS todo_items_fts_index (
    item_id TEXT PRIMARY KEY,
    indexed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (item_id) REFERENCES todo_items(item_id) ON DELETE CASCADE
) STRICT;

-- Index for tracking
CREATE INDEX IF NOT EXISTS idx_fts_index_item_id ON todo_items_fts_index(item_id);
CREATE INDEX IF NOT EXISTS idx_fts_index_indexed_at ON todo_items_fts_index(indexed_at);

-- Trigger: Clean up FTS index when item is deleted
CREATE TRIGGER IF NOT EXISTS trg_todo_items_fts_delete
AFTER DELETE ON todo_items
BEGIN
    DELETE FROM todo_items_fts WHERE item_id = OLD.item_id;
    DELETE FROM todo_items_fts_index WHERE item_id = OLD.item_id;
END;

-- Note: Insert/Update triggers are NOT used because:
-- 1. Data is encrypted in todo_items table
-- 2. Decryption must happen in application layer
-- 3. Report generation process will populate/update FTS index
--
-- Application workflow:
-- 1. Generate report → decrypt items → INSERT into todo_items_fts
-- 2. User edits item → decrypt → UPDATE todo_items_fts
-- 3. User submits feedback → metadata already unencrypted
