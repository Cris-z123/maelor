CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY CHECK(key IN ('schema_version', 'install_time', 'device_fingerprint', 'onboarding_disclosure')),
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS user_config (
    config_key TEXT PRIMARY KEY,
    config_value BLOB NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;

INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('schema_version', '3.0');
INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('install_time', strftime('%s', 'now'));
INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('device_fingerprint', 'unknown');
