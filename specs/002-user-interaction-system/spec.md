# Feature Specification: User Interaction System

**Feature Branch**: `002-user-interaction-system`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "d:\work\project\mailCopilot\docs\user-interaction-design.md根据设计文档输出"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Setup and Configuration (Priority: P1)

As a new user, I want to be guided through initial configuration so that I can start using the application immediately without confusion.

**Why this priority**: This is the entry point for all users. Without completing setup, no other features are accessible. A smooth onboarding experience establishes user trust and reduces abandonment.

**Independent Test**: Can be fully tested by installing a fresh copy and completing the 3-step configuration wizard (email client detection, schedule settings, LLM configuration), verifying that the main interface appears with proper empty state messaging.

**Acceptance Scenarios**:

1. **Given** a fresh application install, **When** the user launches the app for the first time, **Then** the system checks for required permissions (file system and notifications) and presents a welcome screen
2. **Given** the welcome screen is displayed, **When** file system permissions are denied, **Then** the system launches in restricted mode and informs the user of limitations
3. **Given** step 1 of configuration (email client selection), **When** the user selects their email client type (Thunderbird/Outlook/Apple Mail), **Then** the system automatically detects the email client path or allows manual path selection
4. **Given** an invalid email client path is entered, **When** the user attempts to proceed, **Then** the system validates the path and prevents advancement until a valid path containing email files is provided
5. **Given** step 2 of configuration (schedule settings), **When** the user sets the daily report generation time and weekend skip preference, **Then** these settings are persisted for later use
6. **Given** step 3 of configuration (LLM configuration), **When** the user selects remote mode and enters API credentials, **Then** the system tests the connection and only allows completion upon successful connection
7. **Given** the user completes all 3 configuration steps, **When** they click "Finish", **Then** the system displays the main interface with an empty state message encouraging the first manual report generation
8. **Given** the user closes the application during configuration, **When** they relaunch the app, **Then** configuration resumes from the last completed step

---

### User Story 2 - View and Interact with Daily Report (Priority: P1)

As a user, I want to view my daily email report with extracted action items so that I can quickly understand what needs my attention without reading all emails.

**Why this priority**: This is the core value proposition of the application - converting email chaos into organized action items. Without this feature, the product provides no user value.

**Independent Test**: Can be fully tested by generating a report with sample emails, verifying that items are correctly categorized into "completed" and "todo" sections, confidence indicators are displayed, and item details can be expanded/collapsed.

**Acceptance Scenarios**:

1. **Given** a report has been generated, **When** the user views the main interface, **Then** the system displays a summary banner showing total emails processed and count of items requiring review
2. **Given** the main interface is displayed, **When** there are no reports for today, **Then** the system shows an empty state with the scheduled generation time and a "Generate Now" button
3. **Given** items are displayed in the report, **When** an item has high confidence (≥0.8), **Then** the system displays a checkmark icon with "准确" (Accurate) label and white background
4. **Given** items are displayed in the report, **When** an item has medium confidence (0.6-0.79), **Then** the system displays an exclamation icon with "需复核" (Needs Review) label and blue left border
5. **Given** items are displayed in the report, **When** an item has low confidence (<0.6), **Then** the system displays double exclamation icon with "需复核" label and light yellow background
6. **Given** an item is displayed, **When** the user clicks the expand/collapse icon, **Then** the system reveals or hides detailed information including extraction rationale and email metadata
7. **Given** an expanded item detail, **When** the user clicks "Copy Search Term", **Then** the system copies search keywords to clipboard and displays a confirmation toast
8. **Given** the user is in AI Explanation mode (enabled in settings), **When** viewing item details, **Then** the system displays confidence score, confidence level classification, and judgment rationale
9. **Given** AI Explanation mode is disabled (default), **When** viewing item details, **Then** the system hides technical confidence details and shows only user-friendly labels

---

### User Story 3 - Provide Feedback on AI Analysis (Priority: P1)

As a user, I want to mark items as correct or incorrect so that the system can learn and improve future analysis accuracy.

**Why this priority**: This feedback mechanism enables continuous improvement of AI accuracy. Without it, the system cannot adapt to user's specific context and communication patterns.

**Independent Test**: Can be fully tested by marking items as accurate (OK) or incorrect (X), verifying that feedback is stored locally, appropriate confirmation messages appear, and item cards show feedback status.

**Acceptance Scenarios**:

1. **Given** an item card is displayed, **When** the user hovers over the OK button, **Then** the system displays a tooltip "标记准确" (Mark as Accurate)
2. **Given** an item card is displayed, **When** the user clicks the OK button, **Then** the system displays "已标记为准确" toast for 2 seconds and grays out the feedback buttons
3. **Given** an item card is displayed, **When** the user hovers over the X button, **Then** the system displays a tooltip "标记错误" (Mark as Incorrect)
4. **Given** an item card is displayed, **When** the user clicks the X button, **Then** the system displays a dialog with four error type options (content error, priority error, not an action item, wrong source)
5. **Given** the error reason dialog is displayed, **When** the user selects an error type and submits, **Then** the system records the feedback locally, displays a confirmation toast, and marks the item as "已反馈" (Feedback Provided)
6. **Given** the error reason dialog is displayed, **When** the user clicks cancel, **Then** the system closes the dialog without saving feedback
7. **Given** feedback has been submitted for an item, **When** the user views the feedback in settings, **Then** the system displays total feedback count and本月修正 count (corrections this month)
8. **Given** the user chooses to destroy all feedback data, **When** they confirm the destruction, **Then** the system permanently deletes all feedback records with clear warning about irreversibility

---

### User Story 4 - Manually Generate Daily Report (Priority: P1)

As a user, I want to manually trigger report generation on demand so that I don't have to wait for the scheduled time.

**Why this priority**: Users need flexibility to generate reports when convenient, not just at the scheduled time. This is essential for initial testing and ad-hoc usage.

**Independent Test**: Can be fully tested by clicking the manual generate button, confirming the dialog, waiting for completion, and verifying that a new report appears with correct item categorization.

**Acceptance Scenarios**:

1. **Given** the main interface is displayed, **When** unprocessed emails exist, **Then** the "Generate Manually" button is enabled
2. **Given** the main interface is displayed, **When** no unprocessed emails exist, **Then** the "Generate Manually" button is disabled with tooltip "暂无新邮件" (No new emails)
3. **Given** the user clicks "Generate Manually" with new emails available, **When** the confirmation dialog appears, **Then** the system shows the count of unprocessed emails
4. **Given** the confirmation dialog is displayed, **When** the user clicks "Start Generation", **Then** the system displays a progress dialog with percentage, current count, and current email subject being processed
5. **Given** the progress dialog is displayed, **When** the user clicks "Cancel", **Then** the system stops processing and returns to the main interface
6. **Given** processing completes successfully, **When** the completion dialog appears, **Then** the system shows total emails processed, item counts (completed vs todo), and count of items needing review
7. **Given** processing completes with some email parsing failures, **When** the completion dialog appears, **Then** the system shows success count, failure count, and failure reasons (corrupted format, size exceeded)
8. **Given** the completion dialog is displayed, **When** the user clicks "View Report", **Then** the system refreshes the main interface to display the newly generated report

---

### User Story 5 - Browse and Search Historical Reports (Priority: P1)

As a user, I want to access and search through previous daily reports so that I can reference past action items and track my work history.

**Why this priority**: Users need to reference past decisions and commitments. Without historical access, the application loses much of its value as a productivity tool.

**Independent Test**: Can be fully tested by generating multiple reports across different dates, then navigating through calendar view, selecting dates, using search functionality, and verifying that correct items appear with pagination working properly.

**Acceptance Scenarios**:

1. **Given** the user navigates to the History page, **When** historical reports exist, **Then** the system displays a calendar with blue dots on dates containing reports
2. **Given** the History page is displayed, **When** no historical reports exist, **Then** the system shows an empty state with message "暂无历史报告" (No historical reports)
3. **Given** the calendar is displayed, **When** the user clicks a date with a report, **Then** the system displays that date's report with item counts and review count
4. **Given** the History page is displayed, **When** the user enters search keywords, **Then** the system searches across item titles, descriptions, senders, and email subjects with 300ms debounce
5. **Given** search is active, **When** results are displayed, **Then** the system shows the match count and highlights matching keywords
6. **Given** many search results exist, **When** the list exceeds 20 items, **Then** the system implements pagination with 20 items per page
7. **Given** the user applies date filter (today/last 7 days/last 30 days/this month/last month/custom range), **When** results are displayed, **Then** the system shows only reports matching the selected date range
8. **Given** a historical report is displayed, **When** the user clicks "View Details", **Then** the system shows full item details identical to the main interface interaction

---

### User Story 6 - Configure Application Settings (Priority: P1)

As a user, I want to modify application configuration through a settings interface so that I can adapt the system to my preferences and needs.

**Why this priority**: Users need control over application behavior. Without configurable settings, the system cannot accommodate different working styles and preferences.

**Independent Test**: Can be fully tested by navigating to settings page, modifying each configuration section (email path, schedule, LLM, display, notifications, data), saving changes, and verifying that changes persist and take effect.

**Acceptance Scenarios**:

1. **Given** the user opens the Settings page, **When** email configuration is displayed, **Then** the system shows current email client type and path with a "Modify Path" button
2. **Given** the email configuration section, **When** the user clicks "Modify Path", **Then** the system allows path selection with validation for existing email files
3. **Given** the schedule settings section, **When** the user modifies the daily generation time or weekend skip preference, **Then** the system saves the changes and updates the scheduled task
4. **Given** the LLM configuration section, **When** the user switches between remote and local modes, **Then** the system shows appropriate configuration fields for the selected mode
5. **Given** the LLM configuration section, **When** the user clicks "Test Connection", **Then** the system validates the configuration and displays connection status with response time
6. **Given** the display settings section, **When** the user toggles "AI Explanation Mode", **Then** the system enables or disables detailed confidence display throughout the interface
7. **Given** the notification settings section, **When** the user enables/disables desktop notifications or do-not-disturb mode, **Then** the system applies these settings immediately
8. **Given** the notification settings section, **When** the user clicks "Test Notification", **Then** the system displays a sample desktop notification
9. **Given** the data management section, **When** the user clicks "Clean Data Older Than 30 Days", **Then** the system shows a confirmation dialog with impact details and requires explicit confirmation
10. **Given** the data management section, **When** the user clicks "Clear All History", **Then** the system displays a warning dialog requiring the user to type "确认删除" (Confirm Delete) before proceeding
11. **Given** the "About" section, **When** the user clicks "Check Updates", **Then** the system queries for updates and displays the current version and latest version information

---

### User Story 7 - Receive Desktop Notifications (Priority: P2)

As a user, I want to receive desktop notifications for important events so that I can stay informed without keeping the application window open.

**Why this priority**: Notifications enhance user engagement and awareness, but the application remains functional without them. This is P2 because it's a convenience feature, not a core requirement.

**Independent Test**: Can be fully tested by configuring notification settings, triggering notification events (report generation completion, system errors), and verifying that notifications appear with correct content and timing.

**Acceptance Scenarios**:

1. **Given** scheduled or manual report generation completes, **When** notifications are enabled, **Then** the system displays a desktop notification showing success email count, completed items count, todo items count, and review-needed count
2. **Given** a report generation completion notification is displayed, **When** the user clicks "View Report", **Then** the system brings the application window to front and shows the generated report
3. **Given** a system error occurs (e.g., LLM connection failure), **When** the error notification appears, **Then** the system displays error details and remains visible until manually dismissed
4. **Given** do-not-disturb mode is enabled (22:00-08:00), **When** a non-urgent notification triggers during these hours, **Then** the system suppresses the notification
5. **Given** multiple identical notifications occur within 3 minutes, **When** the aggregation rule applies, **Then** the system merges them into a single notification
6. **Given** a single item requires attention, **When** notifications have been sent twice, **Then** the system stops sending additional notifications for that item
7. **Given** a normal priority notification is displayed, **When** 5 seconds elapse, **Then** the system automatically dismisses the notification
8. **Given** the user disables desktop notifications in settings, **When** notification events occur, **Then** the system completely suppresses all desktop notifications

---

### User Story 8 - Edit Action Item Details (Priority: P2)

As a user, I want to edit item details inline so that I can correct mistakes or add missing information without leaving the context.

**Why this priority**: Inline editing improves user efficiency and data accuracy, but users can still provide feedback without it. This is P2 because it enhances the experience rather than being essential.

**Independent Test**: Can be fully tested by double-clicking editable fields (title, due date, description, priority), modifying values, verifying validation, and confirming that changes auto-save with visual feedback.

**Acceptance Scenarios**:

1. **Given** an item card is displayed, **When** the user double-clicks the task title field, **Then** the system converts the field to an editable text input with light blue background and blue border
2. **Given** the title field is in edit mode, **When** the user stops typing for 1 second or the field loses focus, **Then** the system validates (non-empty, max 200 characters), auto-saves, and shows a green checkmark animation
3. **Given** the title field validation fails, **When** the save attempt occurs, **Then** the system shows a shake animation and red error message without closing edit mode
4. **Given** an item card is displayed, **When** the user double-clicks the due date field, **Then** the system displays a date picker for selection
5. **Given** an item card is displayed, **When** the user double-clicks the description field, **Then** the system converts it to a multi-line text area with max 500 characters
6. **Given** an item card is displayed, **When** the user double-clicks the priority field, **Then** the system displays a dropdown with High/Medium/Low options
7. **Given** any field is modified and saved, **When** the change persists, **Then** the system displays a small dot indicator in the top-right corner of the item card
8. **Given** field auto-save fails, **When** the error occurs, **Then** the system displays an error toast and prevents leaving edit mode until the issue is resolved

---

### User Story 9 - Application Updates Management (Priority: P2)

As a user, I want to be informed about application updates and easily install them so that I can benefit from new features and bug fixes.

**Why this priority**: Automatic updates ensure users have the latest security patches and features, but manual update checking is still functional. This is P2 because the application works without immediate updates.

**Independent Test**: Can be fully tested by configuring auto-update settings, triggering update checks, simulating available updates, and verifying that update dialogs appear correctly at startup.

**Acceptance Scenarios**:

1. **Given** the application launches, **When** an update check runs in the background, **Then** the system silently queries for updates without disrupting the user
2. **Given** a new version is available at startup, **When** the update is detected, **Then** the system displays a notification bubble with update information
3. **Given** a major version update is available (e.g., v1.x to v2.0), **When** the update dialog appears, **Then** the system marks it as important and shows detailed release notes
4. **Given** a minor version update is available (e.g., v1.2 to v1.3), **When** the update dialog appears, **Then** the system provides a "Remind Me Later" option
5. **Given** a patch version update is available (e.g., v1.2.0 to v1.2.1), **When** the update is downloaded, **Then** the system performs silent background download and prompts at next restart
6. **Given** the user clicks "Check Updates" in settings, **When** the check completes, **Then** the system displays current version, latest version, and release notes if updates are available
7. **Given** an update download completes, **When** the restart prompt appears, **Then** the system shows current version, new version, and warns that the application will close during restart
8. **Given** auto-update is enabled in settings, **When** the update check finds a security patch, **Then** the system immediately prompts for update with "Update Now" action
9. **Given** the user disables "Auto-check for updates", **When** the application starts, **Then** the system does not perform automatic update checks

---

### Edge Cases

1. **What happens when** the user's email client path becomes invalid after initial configuration (e.g., email client uninstalled or profile moved)?
   - System should detect path invalidity when attempting to generate reports, display error dialog with specific reason (path not found / no permissions / not installed), and provide "Re-select Path" and "View Help" actions

2. **What happens when** LLM API connection fails during scheduled report generation?
   - System should retry connection up to 3 times with exponential backoff, display error notification if all retries fail, and offer to switch to local mode or retry manually

3. **What happens when** the user's disk has insufficient space during report generation?
   - System should detect available disk space before processing, prevent generation if space < 100MB, display error dialog "磁盘空间不足,请清理后重试" (Insufficient disk space, please clean up and retry)

4. **What happens when** the application is processing a large batch of emails (>1000)?
   - System should display message "检测到1234封邮件,将分批处理" (Detected 1234 emails, will process in batches), process in chunks of 100 emails, and show overall progress with current batch information

5. **What happens when** a single email exceeds size limits (>20MB)?
   - System should skip the email during processing, log the skip reason, and include in completion summary: "跳过1封超大邮件(25MB)" (Skipped 1 oversized email (25MB))

6. **What happens when** the user force-quits the application during report generation?
   - System should display confirmation dialog "报告生成中,确定要退出吗?" (Report generation in progress, are you sure you want to quit?), and if confirmed, the Electron main process continues background generation with next launch showing "上次生成已完成" (Last generation completed)

7. **What happens when** the database file becomes corrupted?
   - System should attempt automatic recovery, if recovery fails then prompt user "数据库异常,建议备份后重置" (Database anomaly, recommend backing up before resetting), and offer reset to default configuration

8. **What happens when** configuration file is corrupted on application launch?
   - System should restore default configuration values automatically, display toast "配置已重置为默认值" (Configuration reset to defaults), and guide user through settings if needed

9. **What happens when** the user tries to clear all history but accidentally clicks "Delete" without typing the confirmation phrase correctly?
   - System should validate that the user typed "确认删除" exactly, keep the delete button disabled until the exact phrase is entered, and show error message if the phrase doesn't match

10. **What happens when** network connection is lost during LLM processing?
    - System should pause processing, display reconnection dialog "网络连接中断,正在重试..." (Network connection interrupted, retrying...), wait up to 30 seconds for reconnection, and if timeout occurs offer options to "Retry" / "Modify Configuration" / "View Logs"

## Requirements *(mandatory)*

### Functional Requirements

#### Configuration & Setup
- **FR-001**: System MUST guide users through a 3-step initial configuration wizard (email client detection, schedule settings, LLM configuration) on first launch
- **FR-002**: System MUST request file system and notification permissions before allowing access to main application features
- **FR-003**: System MUST automatically detect email client installation paths for Thunderbird, Outlook, and Apple Mail, and allow manual path selection if auto-detection fails
- **FR-004**: System MUST validate email client paths by verifying the path exists and contains email files before accepting the configuration
- **FR-005**: System MUST persist user configuration (email path, schedule settings, LLM credentials, display preferences) locally and restore on application restart
- **FR-006**: System MUST test LLM API connectivity during configuration and prevent completion until successful connection is confirmed
- **FR-007**: System MUST support both remote LLM mode (API endpoint + API key) and local LLM mode (Ollama configuration)

#### Report Generation & Display
- **FR-008**: System MUST generate daily reports by extracting action items from emails using LLM analysis
- **FR-009**: System MUST categorize extracted items into "completed" (已完成) and "todo" (待办) based on LLM semantic analysis
- **FR-010**: System MUST assign confidence scores (0.0-1.0) to each extracted item and display appropriate indicators:
  - High confidence (≥0.8): Checkmark icon, "准确" label, white background
  - Medium confidence (0.6-0.79): Exclamation icon, "需复核" label, blue left border
  - Low confidence (<0.6): Double exclamation icon, "需复核" label, light yellow background (#FFFBE6)
- **FR-011**: System MUST display a summary banner at the top of today's report using template format: "今天共处理 {total} 封邮件,其中 {review_count} 件需要你重点关注。" (Today processed {total} emails, {review_count} items need your attention)
- **FR-012**: System MUST display report items in two sections: "已完成事项" (Completed Items) and "待办事项" (Todo Items)
- **FR-013**: System MUST allow users to expand and collapse item details to show extraction rationale and email metadata
- **FR-014**: System MUST provide "Copy Search Term" button on each item that copies search keywords (format: `from:{sender} {subject_keywords}`) to clipboard
- **FR-015**: System MUST support two display modes:
  - Default mode: Shows only "准确" or "需复核" labels without technical details
  - AI Explanation mode (toggle in settings): Shows confidence score, classification, and judgment rationale
- **FR-016**: System MUST display empty state on main interface when no report exists for today, with scheduled generation time and "Generate Now" button
- **FR-017**: System MUST display celebratory empty state when today's report exists but contains no action items requiring attention

#### Manual Report Generation
- **FR-018**: System MUST provide "Generate Manually" button that triggers report generation on demand
- **FR-019**: System MUST disable "Generate Manually" button when no unprocessed emails exist
- **FR-020**: System MUST display confirmation dialog showing count of unprocessed emails before starting generation
- **FR-021**: System MUST display progress dialog during generation with:
  - Overall progress bar with percentage
  - Current stage (Email reading, Email parsing, AI processing)
  - Current count (e.g., "已处理: 12 / 23 封邮件")
  - Current email subject being processed
  - Cancellable operation
- **FR-022**: System MUST allow cancelling report generation during processing, stopping at the current batch
- **FR-023**: System MUST display completion dialog after generation showing:
  - Total emails processed
  - Extracted items count (completed vs todo)
  - Count of items needing review
  - Any failures (corrupted emails, oversized emails)
- **FR-024**: System MUST automatically generate reports at scheduled time (user-configurable, default 18:00) unless configured to skip weekends

#### Feedback System
- **FR-025**: System MUST provide feedback buttons (OK/X) on each item card for users to mark analysis accuracy
- **FR-026**: System MUST display confirmation toast (2 seconds) when user marks item as accurate (OK button)
- **FR-027**: System MUST display error reason selection dialog when user marks item as incorrect (X button) with four options:
  - Content error (内容错误): Item description is inaccurate
  - Priority error (优先级错误): Should not be categorized as todo/completed
  - Not an item (非事项): This is not an actionable item
  - Source error (来源错误): Associated email is incorrect
- **FR-028**: System MUST store all feedback data locally on device without uploading to remote servers
- **FR-029**: System MUST mark items as "已反馈" (Feedback Provided) after feedback submission
- **FR-030**: System MUST display feedback statistics in settings data management section (total accuracy markings, error feedback count)
- **FR-031**: System MUST provide option to permanently destroy all feedback data with explicit confirmation dialog showing impact

#### Historical Reports & Search
- **FR-032**: System MUST provide History page with calendar view showing all historical reports
- **FR-033**: System MUST display calendar with blue dots on dates containing reports
- **FR-034**: System MUST allow users to select dates from calendar to view that day's report
- **FR-035**: System MUST provide search functionality across item titles, descriptions, senders, and email subjects
- **FR-036**: System MUST implement 300ms debounce on search input to reduce unnecessary queries
- **FR-037**: System MUST display match count in search results
- **FR-038**: System MUST highlight matching keywords in search results
- **FR-039**: System MUST implement pagination for search results with 20 items per page when results exceed 20 items
- **FR-040**: System MUST provide date filter options: All, Today, Last 7 Days, Last 30 Days, This Month, Last Month, Custom Range
- **FR-041**: System MUST display empty state when no historical reports exist

#### Settings & Configuration Management
- **FR-042**: System MUST provide Settings page organized into sections: Email Configuration, Schedule Settings, LLM Configuration, Display Settings, Notification Settings, Data Management, About
- **FR-043**: System MUST allow users to modify email client path with validation
- **FR-044**: System MUST allow users to modify daily report generation time (hour 0-23, minute 0-59)
- **FR-045**: System MUST allow users to enable/disable "Skip Weekends" option for scheduled generation
- **FR-046**: System MUST allow users to switch between remote and local LLM modes and update configuration accordingly
- **FR-047**: System MUST provide "Test Connection" button for LLM configuration that validates settings and displays connection status with response time
- **FR-048**: System MUST provide toggle for "AI Explanation Mode" that controls confidence detail visibility throughout the interface
- **FR-049**: System MUST provide notification settings:
  - Enable/disable desktop notifications
  - Enable/disable do-not-disturb mode (22:00-08:00)
  - Enable/disable notification sounds
  - Test notification button
- **FR-050**: System MUST display data management statistics (local data size, feedback statistics)
- **FR-051**: System MUST provide "Clean Data Older Than 30 Days" function with confirmation dialog showing impact
- **FR-052**: System MUST provide "Clear All History" function requiring user to type "确认删除" before deletion
- **FR-053**: System MUST provide "Destroy All Feedback Data" function with explicit warning about irreversibility
- **FR-054**: System MUST display application version and provide "Check Updates" button in About section
- **FR-055**: System MUST provide help documentation links (usage tutorial, FAQ, feedback, community) in settings

#### Desktop Notifications
- **FR-056**: System MUST send desktop notifications when report generation completes (showing email counts, completed items, todo items, review-needed count)
- **FR-057**: System MUST send desktop notifications for system errors (LLM connection failures, processing errors)
- **FR-058**: System MUST send desktop notifications for system state changes (configuration updates, permission changes)
- **FR-059**: System MUST implement notification priority levels:
  - Normal: Report generation completion (5 seconds auto-dismiss, clickable)
  - Low: System state changes (3 seconds auto-dismiss, non-clickable)
  - Urgent: Errors (persistent, requires manual dismissal, clickable)
- **FR-060**: System MUST suppress non-urgent notifications during do-not-disturb hours (22:00-08:00)
- **FR-061**: System MUST merge identical notification types within 3-minute window into single notification
- **FR-062**: System MUST limit individual item notifications to maximum 2 occurrences
- **FR-063**: System MUST provide notification click actions (e.g., "View Report" brings app to front and shows report)

#### Inline Editing (P2 Feature)
- **FR-064**: System MUST allow inline editing of task title by double-clicking the field (non-empty, max 200 characters)
- **FR-065**: System MUST allow inline editing of due date by double-clicking the field (date picker)
- **FR-066**: System MUST allow inline editing of task description by double-clicking the field (max 500 characters)
- **FR-067**: System MUST allow inline editing of priority by double-clicking the field (dropdown: High/Medium/Low)
- **FR-068**: System MUST auto-save changes after 1 second of inactivity or when field loses focus
- **FR-069**: System MUST display visual feedback during editing (light blue background #EFF6FF, blue border #4F46E5)
- **FR-070**: System MUST display green checkmark animation on successful save
- **FR-071**: System MUST display shake animation and red error message on validation failure
- **FR-072**: System MUST display small dot indicator on modified item cards

#### Application Updates (P2 Feature)
- **FR-073**: System MUST automatically check for updates on application launch
- **FR-074**: System MUST check for updates every 7 days when running
- **FR-075**: System MUST classify update importance:
  - Major version increase (e.g., v1.x to v2.0): Important, requires detailed explanation
  - Minor version increase (e.g., v1.2 to v1.3): Normal feature update, "Remind Me Later" option
  - Patch version increase (e.g., v1.2.0 to v1.2.1): Bug fix, silent background download
  - Security patches: Important security, immediate prompt with "Update Now" action
- **FR-076**: System MUST display update notification bubble on startup when new version is available
- **FR-077**: System MUST provide update dialog showing current version, latest version, release notes, release date, and download size
- **FR-078**: System MUST download updates in background and prompt for restart when download completes
- **FR-079**: System MUST provide auto-update configuration options:
  - Auto-check for updates (recommended)
  - Manual check only
  - Download security updates without asking
  - Prompt before downloading feature updates

#### Error Handling & Resilience
- **FR-080**: System MUST validate file paths before accepting configuration and display specific error messages for invalid paths
- **FR-081**: System MUST handle LLM connection failures with retry logic (3 attempts, exponential backoff) and user notification
- **FR-082**: System MUST skip corrupted emails during processing and log failures with specific reasons (format corrupted, size exceeded)
- **FR-083**: System MUST detect insufficient disk space before processing and prevent operation if < 100MB available
- **FR-084**: System MUST handle large email batches (>1000) by processing in chunks of 100 emails with progress indication
- **FR-085**: System MUST confirm before allowing application exit during report generation
- **FR-086**: System MUST continue background processing if user force-quits during report generation and display completion status on next launch
- **FR-087**: System MUST attempt automatic database recovery on corruption and prompt user if recovery fails
- **FR-088**: System MUST restore default configuration if configuration file is corrupted and notify user
- **FR-089**: System MUST handle network interruptions during LLM processing with pause, retry for 30 seconds, and user options on timeout

#### Visual Design & Accessibility
- **FR-090**: System MUST use color palette:
  - Primary (智捷蓝): #4F46E5
  - Secondary (灵动青): #06B6D4
  - Success (翠绿): #10B981
  - Warning (琥珀黄): #F59E0B
  - Error (珊瑚红): #EF4444
  - Background (极简灰): #F8FAFC
  - Text (深岩灰): #1E293B
  - Secondary text (中灰): #64748B
  - Disabled (浅灰): #CBD5E1
  - Card background (纯白): #FFFFFF
  - Border (淡灰蓝): #E2E8F0
  - Low confidence background: #FFFBE6
- **FR-091**: System MUST use Inter font family with sizes: 24px (page title), 18px (section title), 14px (body), 12px (small), 14px (button), 13px (code/path)
- **FR-092**: System MUST ensure color contrast meets WCAG AA standards (深岩灰 on 极简灰: 14.3:1, 智捷蓝 on 纯白: 5.1:1, 次要文字 on 极简灰: 4.8:1)
- **FR-093**: System MUST support keyboard navigation: Tab for focus switching, Enter for confirmation, Esc for closing dialogs
- **FR-094**: System MUST provide ARIA labels for interactive elements (item cards, feedback buttons, confidence indicators, progress bars)
- **FR-095**: System MUST implement animation timing: 150ms (fast - button hover), 300ms (standard - expand/collapse), 500ms (slow - page transitions)

### Key Entities

- **User Configuration**: Stores user's application settings including email client path, daily report generation schedule, LLM mode selection (remote/local), API credentials, display preferences (AI explanation mode), notification preferences, and auto-update settings

- **Daily Report**: Represents a generated report for a specific date containing summary statistics (total emails processed, items extracted, review count), list of action items categorized as completed or todo, generation timestamp, and processing status

- **Action Item**: Represents an extracted task or commitment from an email with attributes including title, description, confidence score (0.0-1.0), classification (completed/todo), priority (high/medium/low), due date (optional), extraction rationale, source email metadata (sender, subject, timestamp, message ID, file path, search keywords), feedback status, and modification history

- **Email Metadata**: Stores reference information for source email including sender name and email address, send timestamp, email subject, message ID, file path, and generated search keywords for email client lookup

- **Feedback Record**: Stores user's accuracy feedback for an action item including feedback type (accurate/inaccurate), error reason category (if inaccurate), timestamp, and reference to the action item

- **Historical Report Index**: Maintains calendar-based index of all generated reports with date, item count, review count, and quick access references for historical browsing

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete initial 3-step configuration in under 5 minutes on first application launch
- **SC-002**: Users can generate a daily report from 100 emails in under 2 minutes
- **SC-003**: Users can locate and review any historical report within 30 seconds using calendar navigation or search
- **SC-004**: Users can mark an item as accurate or incorrect with no more than 2 clicks
- **SC-005**: Users can modify any application setting and see changes take effect immediately without application restart
- **SC-006**: 90% of users successfully complete their first manual report generation without requiring help documentation
- **SC-007**: Users can cancel report generation during processing and return to main interface within 3 seconds
- **SC-008**: Application handles processing of 1000+ emails without interface freezing or becoming unresponsive
- **SC-009**: Desktop notifications for report generation appear within 5 seconds of completion
- **SC-010**: Users can expand/collapse item details with smooth animation completing within 300ms
- **SC-011**: Search results appear within 1 second for databases containing up to 10,000 historical items
- **SC-012**: Inline editing of item fields auto-saves changes within 2 seconds of inactivity
- **SC-013**: Application startup time (including automatic update check) is under 3 seconds on subsequent launches
- **SC-014**: Users can copy search keywords to clipboard and see confirmation toast within 1 second
- **SC-015**: Error messages provide specific, actionable guidance (not generic errors) in 100% of failure scenarios
- **SC-016**: Empty state displays encourage user action and reduce confusion by 80% compared to blank screens
- **SC-017**: Notification do-not-disturb mode prevents all non-urgent notifications during configured hours in 100% of cases
- **SC-018**: Data export (clear history) completes within 10 seconds for databases containing up to 10,000 items
- **SC-019**: Users can distinguish between high, medium, and low confidence items at a glance without reading text (visual indicators only)
- **SC-020**: Application window maintains responsiveness during LLM API calls (progress indicators, cancellable operations)
