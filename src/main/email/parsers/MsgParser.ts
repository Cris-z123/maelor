/**
 * MsgParser - Outlook .msg format parser
 *
 * Parses Outlook .msg files using @kenjiuno/msgreader library.
 * Per plan.md FR-008 and SC-004: ≥85% Message-ID extraction rate.
 * Falls back to SHA-256 fingerprint when Message-ID unavailable.
 *
 * Migration 2026-02-24: Migrated from msg-extractor to @kenjiuno/msgreader
 * for better TypeScript support and active maintenance.
 *
 * @module main/email/parsers/MsgParser
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../config/logger.js';
import type { EmailParser, ParsedEmail } from './EmailParser.js';
import { formatISO8601 } from '../../../shared/utils/dateUtils.js';

// Load MsgReader dynamically to work around TypeScript NodeNext + CommonJS interop issue
const MsgReader = require('@kenjiuno/msgreader');

/**
 * MsgParser implements EmailParser interface for Outlook .msg files
 *
 * .msg format is Outlook's proprietary format with moderate Message-ID
 * extraction rate (≥85% per SC-004).
 */
export class MsgParser implements EmailParser {
  /**
   * Maximum body size before truncation (100k chars per plan.md constraints)
   */
  private static readonly MAX_BODY_SIZE = 100000;

  /**
   * Parse .msg file and extract metadata
   *
   * @param filePath - Absolute path to .msg file
   * @returns ParsedEmail with metadata and truncated body
   * @throws Error if file is unparseable
   */
  async parse(filePath: string): Promise<ParsedEmail> {
    try {
      logger.debug('MsgParser', `Starting parse for file: ${filePath}`);

      // Read file as Buffer
      const msgBuffer = fs.readFileSync(filePath);

      // Convert Buffer to ArrayBuffer for @kenjiuno/msgreader
      // Buffer extends Uint8Array, which has a .buffer property
      const arrayBuffer = msgBuffer.buffer.slice(
        msgBuffer.byteOffset,
        msgBuffer.byteOffset + msgBuffer.byteLength
      );

      // Parse .msg file using @kenjiuno/msgreader
      const msgReader = new MsgReader(arrayBuffer);
      const msg = msgReader.getFileData();

      // Extract Message-ID (critical for traceability per FR-001)
      const messageId = this.extractMessageId(msg);

      // Extract date early (needed for hash computation)
      const date = this.extractDate(msg);

      // Compute SHA-256 fingerprint per R0-4
      const from = this.extractSenderEmail(msg);
      const emailHash = this.computeEmailHash(messageId, date, from);

      // Extract subject
      const subject = this.extractSubject(msg);

      // Extract attachment metadata
      const attachments = this.extractAttachments(msg);

      // Extract and truncate body
      const body = this.extractBody(msg);

      logger.debug('MsgParser', `Successfully parsed email: ${messageId || '(no Message-ID)'}`);

      return {
        email_hash: emailHash,
        message_id: messageId,
        from,
        subject,
        date,
        attachments,
        body,
        file_path: filePath,
        format: 'msg',
        extract_status: body ? 'success' : 'no_content',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('MsgParser', 'Failed to parse .msg file', error, { filePath });

      throw new Error(`MsgParser failed for ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Check if file can be parsed as .msg
   *
   * @param filePath - Absolute path to file
   * @returns true if file has .msg extension
   */
  canParse(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.msg';
  }

  /**
   * Extract Message-ID from .msg file
   *
   * Message-ID extraction rate for .msg format is ≥85% per SC-004.
   *
   * @param msg - MsgReader message object
   * @returns Message-ID string or undefined if missing
   */
  private extractMessageId(msg: any): string | undefined {
    // @kenjiuno/msgreader provides various properties
    // Try internetMessageId first (most reliable)
    if (msg.internetMessageId) {
      const messageId = String(msg.internetMessageId).trim();
      // Clean up Message-ID (remove angle brackets if present)
      return messageId.replace(/^<|>$/g, '');
    }

    // Some .msg files store Message-ID in headers
    if (msg.headers && msg.headers['message-id']) {
      const messageId = String(msg.headers['message-id']).trim();
      return messageId.replace(/^<|>$/g, '');
    }

    // Try transport headers
    if (msg.transportHeaders) {
      const match = msg.transportHeaders.match(/Message-ID:\s*<([^>]+)>/i);
      if (match) {
        return match[1];
      }
    }

    logger.debug('MsgParser', 'Message-ID not found in .msg file (expected for ~15% of files per SC-004)');
    return undefined;
  }

  /**
   * Extract subject from .msg file
   *
   * @param msg - MsgReader message object
   * @returns Subject line
   */
  private extractSubject(msg: any): string {
    if (msg.subject) {
      return String(msg.subject).trim();
    }
    return '(无主题)';
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
    // Use fallback if Message-ID missing (degraded mode)
    const idPart = messageId || 'no-message-id';

    // Concatenate and hash
    const hashInput = `${idPart}${date}${from}`;
    return createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Extract sender email address
   *
   * @param msg - MsgReader message object
   * @returns Sender email address
   */
  private extractSenderEmail(msg: any): string {
    // Try senderEmailType and senderEmailAddress (MsgReader properties)
    if (msg.senderEmailAddress) {
      return String(msg.senderEmailAddress).toLowerCase().trim();
    }

    // Try fromEmail property
    if (msg.fromEmail) {
      return String(msg.fromEmail).toLowerCase().trim();
    }

    // Try senderName with email extraction
    if (msg.senderName) {
      const senderName = String(msg.senderName);
      const emailMatch = senderName.match(/<([^>]+)>/);
      if (emailMatch) {
        return emailMatch[1].toLowerCase().trim();
      }
      // Check if it's a plain email
      if (senderName.includes('@')) {
        return senderName.toLowerCase().trim();
      }
    }

    // Try sentRepresentingEmailAddress
    if (msg.sentRepresentingEmailAddress) {
      return String(msg.sentRepresentingEmailAddress).toLowerCase().trim();
    }

    // Last resort fallback
    logger.debug('MsgParser', 'Sender email not found, using fallback');
    return 'unknown@example.com';
  }

  /**
   * Extract date as ISO 8601 string
   *
   * Uses date-fns formatISO8601 per plan.md R0-9 for consistent date handling.
   *
   * @param msg - MsgReader message object
   * @returns ISO 8601 date string
   */
  private extractDate(msg: any): string {
    // Try clientSubmitTime (most accurate for sent emails)
    if (msg.clientSubmitTime) {
      const date = new Date(msg.clientSubmitTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Try messageDeliveryTime
    if (msg.messageDeliveryTime) {
      const date = new Date(msg.messageDeliveryTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Try creationTime
    if (msg.creationTime) {
      const date = new Date(msg.creationTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Try lastModificationTime
    if (msg.lastModificationTime) {
      const date = new Date(msg.lastModificationTime);
      if (!isNaN(date.getTime())) {
        return formatISO8601(date);
      }
    }

    // Fallback to current time (using date-fns formatISO8601 per plan.md R0-9)
    logger.debug('MsgParser', 'Date not found in .msg file, using current time');
    return formatISO8601(new Date());
  }

  /**
   * Extract attachment metadata (no content per FR-044)
   *
   * @param msg - MsgReader message object
   * @returns Attachment metadata array
   */
  private extractAttachments(msg: any): Array<{ filename: string; size: number; mime_type: string }> {
    const attachments: Array<{ filename: string; size: number; mime_type: string }> = [];

    // @kenjiuno/msgreader provides attachment files
    if (msg.attachmentFiles && Array.isArray(msg.attachmentFiles)) {
      for (const att of msg.attachmentFiles) {
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
   * Extract and truncate email body
   *
   * Truncates to 100k characters per plan.md constraints.
   * Returns undefined if body is too short (<200 chars) per FR-013.
   *
   * @param msg - MsgReader message object
   * @returns Truncated body content or undefined
   */
  private extractBody(msg: any): string | undefined {
    // Prefer plain text body, fallback to HTML
    let body = '';

    if (msg.body) {
      // @kenjiuno/msgreader provides body as string or Buffer
      body = typeof msg.body === 'string' ? msg.body : msg.body.toString('utf-8');
    } else if (msg.bodyHtml) {
      body = typeof msg.bodyHtml === 'string' ? msg.bodyHtml : msg.bodyHtml.toString('utf-8');
    } else if (msg.htmlBody) {
      body = typeof msg.htmlBody === 'string' ? msg.htmlBody : msg.htmlBody.toString('utf-8');
    }

    // Strip HTML tags if HTML content
    if ((msg.bodyHtml || msg.htmlBody) && !msg.body) {
      body = body.replace(/<[^>]*>/g, ' ').trim();
      // Replace multiple whitespace with single space
      body = body.replace(/\s+/g, ' ');
    }

    // Truncate to max size
    if (body.length > MsgParser.MAX_BODY_SIZE) {
      body = body.substring(0, MsgParser.MAX_BODY_SIZE);
      logger.debug('MsgParser', 'Body truncated to 100k characters');
    }

    // Check minimum length for reliable fingerprint (FR-013)
    if (body.length < 200) {
      logger.debug('MsgParser', 'Body too short (<200 chars), not reliable for fingerprinting');
      return undefined;
    }

    return body;
  }
}

export default MsgParser;
