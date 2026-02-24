/**
 * PstParser - Outlook .pst/.ost archive parser
 *
 * Parses Outlook .pst/.ost archive files using pst-extractor library.
 * Per plan.md FR-008 and SC-004: ≥90% Message-ID extraction rate.
 * ~200ms overhead per email per plan.md v2.7.
 *
 * Migration 2026-02-24: Migrated from libpff/readpst to pst-extractor
 * for pure JavaScript implementation and cross-platform support.
 *
 * Note: This parser extracts individual emails from PST archives.
 * Each email in the archive is processed as a separate ParsedEmail.
 *
 * @module main/email/parsers/PstParser
 */

import { createHash } from 'crypto';
import * as path from 'path';
import { PSTFile } from 'pst-extractor';
import { logger } from '../../config/logger.js';
import type { EmailParser, ParsedEmail } from './EmailParser.js';
import { formatISO8601 } from '../../../shared/utils/dateUtils.js';

/**
 * PstParser implements EmailParser interface for Outlook .pst/.ost files
 *
 * .pst/.ost formats are Outlook's archive formats with high Message-ID
 * extraction rate (≥90% per SC-004).
 *
 * Note: This parser uses pst-extractor library to extract emails
 * from PST archives without external dependencies.
 */
export class PstParser implements EmailParser {
  /**
   * Maximum body size before truncation (100k chars per plan.md constraints)
   */
  private static readonly MAX_BODY_SIZE = 100000;

  /**
   * Current PST file handle
   */
  private pstFile: PSTFile | null = null;

  /**
   * Current index for iterating through emails in archive
   */
  private currentEmailIndex = 0;

  /**
   * Cached email list for iteration
   */
  private emailCache: Array<any> = [];

  /**
   * Parse .pst/.ost file and extract metadata
   *
   * Note: This method extracts emails one at a time from the archive.
   * Subsequent calls with the same file path will return the next email.
   * Call close() to reset and release the file handle.
   *
   * @param filePath - Absolute path to .pst/.ost file
   * @returns ParsedEmail with metadata for next email in archive
   * @throws Error if file is unparseable or no more emails
   */
  async parse(filePath: string): Promise<ParsedEmail> {
    try {
      logger.debug('PstParser', `Starting parse for file: ${filePath}`);

      // Open PST file if not already open
      if (!this.pstFile || this.getPstFilePath() !== filePath) {
        await this.openPstFile(filePath);
      }

      // Check if we have more emails
      if (this.currentEmailIndex >= this.emailCache.length) {
        throw new Error(`No more emails in PST archive (extracted ${this.emailCache.length} emails)`);
      }

      // Get current email
      const pstEmail = this.emailCache[this.currentEmailIndex];
      this.currentEmailIndex++;

      // Extract metadata
      const messageId = this.extractMessageId(pstEmail);
      const date = this.extractDate(pstEmail);
      const from = this.extractSenderEmail(pstEmail);
      const emailHash = this.computeEmailHash(messageId, date, from);
      const subject = this.extractSubject(pstEmail);
      const attachments = this.extractAttachments(pstEmail);
      const body = this.extractBody(pstEmail);

      logger.debug('PstParser', `Successfully parsed email ${this.currentEmailIndex}/${this.emailCache.length}: ${messageId || '(no Message-ID)'}`);

      return {
        email_hash: emailHash,
        message_id: messageId,
        from,
        subject,
        date,
        attachments,
        body,
        file_path: filePath,
        format: 'pst',
        extract_status: body ? 'success' : 'no_content',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('PstParser', 'Failed to parse .pst/.ost file', error, { filePath });

      throw new Error(`PstParser failed for ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Check if file can be parsed as .pst or .ost
   *
   * @param filePath - Absolute path to file
   * @returns true if file has .pst or .ost extension
   */
  canParse(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.pst' || ext === '.ost';
  }

  /**
   * Open PST file and cache email list
   *
   * @param filePath - Path to PST file
   */
  private async openPstFile(filePath: string): Promise<void> {
    try {
      // Close any existing PST file
      if (this.pstFile) {
        this.close();
      }

      // Open PST file using pst-extractor
      this.pstFile = new PSTFile(filePath);
      this.emailCache = [];
      this.currentEmailIndex = 0;

      // Extract all emails from all folders
      this.extractAllEmails(this.pstFile.getRootFolder());

      logger.info('PstParser', `Opened PST file with ${this.emailCache.length} emails`, {
        filePath,
        emailCount: this.emailCache.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to open PST file: ${errorMessage}`);
    }
  }

  /**
   * Recursively extract emails from PST folders
   *
   * @param folder - PST folder object
   */
  private extractAllEmails(folder: any): void {
    if (!folder) {
      return;
    }

    // Get subfolders
    const subfolders = folder.getSubFolders();
    if (subfolders) {
      for (const subfolder of subfolders) {
        this.extractAllEmails(subfolder);
      }
    }

    // Get emails in this folder
    const emails = folder.getEmails();
    if (emails && Array.isArray(emails)) {
      for (const email of emails) {
        if (email) {
          this.emailCache.push(email);
        }
      }
    }
  }

  /**
   * Get file path of currently open PST file
   *
   * @returns File path or empty string
   */
  private getPstFilePath(): string {
    return this.pstFile?.pstFilename || '';
  }

  /**
   * Extract Message-ID from PST email
   *
   * Message-ID extraction rate for .pst format is ≥90% per SC-004.
   *
   * @param pstEmail - PST email object
   * @returns Message-ID string or undefined if missing
   */
  private extractMessageId(pstEmail: any): string | undefined {
    // pst-extractor provides various properties
    // Try internetMessageId first
    if (pstEmail.internetMessageId) {
      const messageId = String(pstEmail.internetMessageId).trim();
      return messageId.replace(/^<|>$/g, '');
    }

    // Try messageId property
    if (pstEmail.messageId) {
      const messageId = String(pstEmail.messageId).trim();
      return messageId.replace(/^<|>$/g, '');
    }

    // Try headers
    if (pstEmail.headers) {
      const headers = String(pstEmail.headers);
      const match = headers.match(/Message-ID:\s*<([^>]+)>/i);
      if (match) {
        return match[1];
      }
    }

    // Try transportHeaders
    if (pstEmail.transportHeaders) {
      const transportHeaders = String(pstEmail.transportHeaders);
      const match = transportHeaders.match(/Message-ID:\s*<([^>]+)>/i);
      if (match) {
        return match[1];
      }
    }

    logger.debug('PstParser', 'Message-ID not found in PST email (expected for ~10% of files per SC-004)');
    return undefined;
  }

  /**
   * Extract subject from PST email
   *
   * @param pstEmail - PST email object
   * @returns Subject line
   */
  private extractSubject(pstEmail: any): string {
    if (pstEmail.subject) {
      return String(pstEmail.subject).trim();
    }
    return '(无主题)';
  }

  /**
   * Extract sender email address
   *
   * @param pstEmail - PST email object
   * @returns Sender email address
   */
  private extractSenderEmail(pstEmail: any): string {
    // Try senderEmailAddress
    if (pstEmail.senderEmailAddress) {
      return String(pstEmail.senderEmailAddress).toLowerCase().trim();
    }

    // Try fromEmail
    if (pstEmail.fromEmail) {
      return String(pstEmail.fromEmail).toLowerCase().trim();
    }

    // Try senderName with email extraction
    if (pstEmail.senderName) {
      const senderName = String(pstEmail.senderName);
      const emailMatch = senderName.match(/<([^>]+)>/);
      if (emailMatch) {
        return emailMatch[1].toLowerCase().trim();
      }
      if (senderName.includes('@')) {
        return senderName.toLowerCase().trim();
      }
    }

    // Try sentRepresentingEmailAddress
    if (pstEmail.sentRepresentingEmailAddress) {
      return String(pstEmail.sentRepresentingEmailAddress).toLowerCase().trim();
    }

    // Try fromName
    if (pstEmail.fromName) {
      const fromName = String(pstEmail.fromName);
      const emailMatch = fromName.match(/<([^>]+)>/);
      if (emailMatch) {
        return emailMatch[1].toLowerCase().trim();
      }
      if (fromName.includes('@')) {
        return fromName.toLowerCase().trim();
      }
    }

    logger.debug('PstParser', 'Sender email not found, using fallback');
    return 'unknown@example.com';
  }

  /**
   * Extract date as ISO 8601 string
   *
   * Uses date-fns formatISO8601 per plan.md R0-9 for consistent date handling.
   *
   * @param pstEmail - PST email object
   * @returns ISO 8601 date string
   */
  private extractDate(pstEmail: any): string {
    // Try clientSubmitTime (most accurate for sent emails)
    if (pstEmail.clientSubmitTime) {
      const date = new Date(pstEmail.clientSubmitTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Try messageDeliveryTime
    if (pstEmail.messageDeliveryTime) {
      const date = new Date(pstEmail.messageDeliveryTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Try creationTime
    if (pstEmail.creationTime) {
      const date = new Date(pstEmail.creationTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Try lastModificationTime
    if (pstEmail.lastModificationTime) {
      const date = new Date(pstEmail.lastModificationTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Fallback to current time
    logger.debug('PstParser', 'Date not found in PST email, using current time');
    return formatISO8601(new Date());
  }

  /**
   * Extract attachment metadata (no content per FR-044)
   *
   * @param pstEmail - PST email object
   * @returns Attachment metadata array
   */
  private extractAttachments(pstEmail: any): Array<{ filename: string; size: number; mime_type: string }> {
    const attachments: Array<{ filename: string; size: number; mime_type: string }> = [];

    // pst-extractor provides attachments
    if (pstEmail.attachments && Array.isArray(pstEmail.attachments)) {
      for (const att of pstEmail.attachments) {
        attachments.push({
          filename: att.fileName || att.name || 'unnamed',
          size: att.fileSize || att.size || 0,
          mime_type: this.getMimeTypeFromFileName(att.fileName || att.name),
        });
      }
    }

    return attachments;
  }

  /**
   * Guess MIME type from filename
   *
   * @param filename - Attachment filename
   * @returns MIME type string
   */
  private getMimeTypeFromFileName(filename: string | undefined): string {
    if (!filename) {
      return 'application/octet-stream';
    }
    const ext = path.extname(filename).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.eml': 'message/rfc822',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Compute SHA-256 email fingerprint
   *
   * Per plan.md R0-4: SHA256(Message-ID + Date + From)
   * Used for duplicate detection across batches.
   *
   * @param messageId - Message-ID header (may be undefined)
   * @param date - ISO date string
   * @param from - From address
   * @returns SHA-256 hash as hex string
   */
  private computeEmailHash(
    messageId: string | undefined,
    date: string,
    from: string
  ): string {
    const idPart = messageId || 'no-message-id';
    const hashInput = `${idPart}${date}${from}`;
    return createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Extract and truncate email body
   *
   * Truncates to 100k characters per plan.md constraints.
   * Returns undefined if body is too short (<200 chars) per FR-013.
   *
   * @param pstEmail - PST email object
   * @returns Truncated body content or undefined
   */
  private extractBody(pstEmail: any): string | undefined {
    // Prefer plain text body, fallback to HTML
    let body = '';

    if (pstEmail.body) {
      body = typeof pstEmail.body === 'string' ? pstEmail.body : pstEmail.body.toString('utf-8');
    } else if (pstEmail.bodyHtml) {
      body = typeof pstEmail.bodyHtml === 'string' ? pstEmail.bodyHtml : pstEmail.bodyHtml.toString('utf-8');
    } else if (pstEmail.htmlBody) {
      body = typeof pstEmail.htmlBody === 'string' ? pstEmail.htmlBody : pstEmail.htmlBody.toString('utf-8');
    }

    // Strip HTML tags if HTML content
    if ((pstEmail.bodyHtml || pstEmail.htmlBody) && !pstEmail.body) {
      body = body.replace(/<[^>]*>/g, ' ').trim();
      body = body.replace(/\s+/g, ' ');
    }

    // Truncate to max size
    if (body.length > PstParser.MAX_BODY_SIZE) {
      body = body.substring(0, PstParser.MAX_BODY_SIZE);
      logger.debug('PstParser', 'Body truncated to 100k characters');
    }

    // Check minimum length
    if (body.length < 200) {
      logger.debug('PstParser', 'Body too short (<200 chars)');
      return undefined;
    }

    return body;
  }

  /**
   * Close PST file and reset state
   *
   * Call this method when done processing emails from the archive.
   */
  close(): void {
    if (this.pstFile) {
      try {
        this.pstFile.close();
        logger.debug('PstParser', 'Closed PST file');
      } catch (error) {
        logger.warn('PstParser', 'Failed to close PST file', { error });
      }
      this.pstFile = null;
    }

    this.emailCache = [];
    this.currentEmailIndex = 0;
  }

  /**
   * Get total email count in opened PST file
   *
   * @returns Number of emails in archive
   */
  getEmailCount(): number {
    return this.emailCache.length;
  }

  /**
   * Get current email index
   *
   * @returns Current position (1-based) in email iteration
   */
  getCurrentPosition(): number {
    return this.currentEmailIndex;
  }

  /**
   * Reset to beginning of PST file
   */
  reset(): void {
    this.currentEmailIndex = 0;
    logger.debug('PstParser', 'Reset to beginning of PST file');
  }
}

export default PstParser;
