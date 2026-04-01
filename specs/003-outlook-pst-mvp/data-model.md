# Data Model: Outlook PST Direct-Connect MVP

## Entities

### OutlookSourceConfig

- `source_id`: string
- `directory_path`: string
- `last_validated_at`: number
- `last_validation_status`: `valid` | `invalid` | `warning`
- `last_validation_message`: string | null

### DiscoveredPstFile

- `pst_id`: string
- `source_id`: string
- `absolute_path`: string
- `file_name`: string
- `file_size_bytes`: number
- `modified_at`: number
- `readability`: `readable` | `unreadable`
- `readability_reason`: string | null

### ExtractionRun

- `run_id`: string
- `started_at`: number
- `finished_at`: number | null
- `status`: `pending` | `running` | `completed` | `failed`
- `pst_count`: number
- `processed_email_count`: number
- `item_count`: number
- `low_confidence_count`: number
- `error_message`: string | null

### ProcessedEmail

- `email_id`: string
- `run_id`: string
- `pst_id`: string
- `message_identifier`: string | null
- `fingerprint`: string
- `sender_display`: string
- `sender_address`: string | null
- `subject`: string
- `sent_at`: number | null
- `file_path_hint`: string

### ActionItem

- `item_id`: string
- `run_id`: string
- `content`: string
- `item_type`: `todo` | `completed`
- `confidence_score`: number
- `confidence_level`: `high` | `medium` | `low`
- `source_status`: `verified` | `unverified`
- `rationale`: string

### ItemEvidence

- `evidence_id`: string
- `item_id`: string
- `email_id`: string
- `sender_display`: string
- `subject_snippet`: string
- `sent_at`: number | null
- `search_term`: string
- `file_path`: string
- `source_identifier`: string

### SettingsView

- `outlookDirectory`: string
- `aiBaseUrl`: string
- `aiModel`: string
- `databasePath`: string
- `databaseSizeBytes`: number

## Relationships

- `OutlookSourceConfig` 1 -> N `DiscoveredPstFile`
- `ExtractionRun` 1 -> N `ProcessedEmail`
- `ExtractionRun` 1 -> N `ActionItem`
- `DiscoveredPstFile` 1 -> N `ProcessedEmail`
- `ProcessedEmail` 1 -> N `ItemEvidence`
- `ActionItem` 1 -> N `ItemEvidence`

## Notes

- The MVP does not include feedback records.
- Historical review is based on `ExtractionRun`, not calendar-day reports.
- Evidence records are mandatory for displayed items.
