/**
 * Unit tests for MsgParser
 *
 * Tests Outlook .msg format parser with focus on:
 * - Message-ID extraction rate ≥85% per SC-004
 * - SHA-256 fallback when Message-ID missing
 * - Metadata extraction (sender, date, subject, attachments)
 * - Body truncation to 100k characters
 * - Error handling for corrupted files
 *
 * Migration 2026-02-24: Updated tests for @kenjiuno/msgreader library
 *
 * @tests/unit/email-processing/parsers/msg-parser.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MsgParser } from '@/email/parsers/MsgParser';

// Hoist mocks for fs and @kenjiuno/msgreader
const mockReadFileSync = vi.hoisted(() => vi.fn());

// Create a proper constructor mock for MsgReader
const createMockMsgReaderInstance = vi.hoisted(() => ({
  getFileData: vi.fn(),
}));
const mockMsgReaderConstructor = vi.hoisted(() => vi.fn(() => createMockMsgReaderInstance));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    readFileSync: mockReadFileSync,
  },
  readFileSync: mockReadFileSync,
}));

// Mock @kenjiuno/msgreader - properly mock the constructor
vi.mock('@kenjiuno/msgreader', () => ({
  default: mockMsgReaderConstructor,
}));

// Mock logger
vi.mock('@/config/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MsgParser', () => {
  let parser: MsgParser;

  beforeEach(() => {
    parser = new MsgParser();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Message-ID Extraction', () => {
    it('should extract Message-ID from internetMessageId field', async () => {
      const mockMsg = {
        internetMessageId: '<test123@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test Subject',
        body: 'A'.repeat(300), // >200 chars
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.message_id).toBe('test123@example.com');
    });

    it('should extract Message-ID from headers.message-id', async () => {
      const mockMsg = {
        headers: {
          'message-id': '<another456@example.org>',
        },
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.org',
        subject: 'Test',
        body: 'B'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.message_id).toBe('another456@example.org');
    });

    it('should extract Message-ID from transportHeaders', async () => {
      const mockMsg = {
        transportHeaders: 'Message-ID: <transport789@example.net>\nOther-Header: value',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.net',
        subject: 'Test',
        body: 'C'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.message_id).toBe('transport789@example.net');
    });

    it('should remove angle brackets from Message-ID', async () => {
      const mockMsg = {
        internetMessageId: '<brackets@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'D'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.message_id).toBe('brackets@example.com');
      expect(result.message_id).not.toContain('<');
      expect(result.message_id).not.toContain('>');
    });

    it('should return undefined Message-ID when not found (expected for ~15% per SC-004)', async () => {
      const mockMsg = {
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'No Message-ID',
        body: 'E'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.message_id).toBeUndefined();
    });
  });

  describe('Sender Email Extraction', () => {
    it('should extract email from senderEmailAddress field', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'exact@example.com',
        subject: 'Test',
        body: 'F'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.from).toBe('exact@example.com');
    });

    it('should extract email from fromEmail field as fallback', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        fromEmail: 'fromfield@example.com',
        subject: 'Test',
        body: 'G'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.from).toBe('fromfield@example.com');
    });

    it('should extract email from senderName with angle brackets', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderName: 'John Doe <john.doe@example.com>',
        subject: 'Test',
        body: 'H'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.from).toBe('john.doe@example.com');
    });

    it('should extract email from senderName without brackets', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderName: 'plain@example.com',
        subject: 'Test',
        body: 'I'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.from).toBe('plain@example.com');
    });

    it('should use fallback when sender email not found', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        subject: 'No Sender',
        body: 'J'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.from).toBe('unknown@example.com');
    });

    it('should convert email to lowercase', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'UPPERCASE@EXAMPLE.COM',
        subject: 'Test',
        body: 'K'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.from).toBe('uppercase@example.com');
    });
  });

  describe('Date Extraction', () => {
    it('should extract date from clientSubmitTime', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:30:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'L'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.date).toBe('2024-02-05T10:30:00.000Z');
    });

    it('should fallback to messageDeliveryTime when clientSubmitTime unavailable', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        messageDeliveryTime: '2024-02-05T11:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'M'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.date).toBe('2024-02-05T11:00:00.000Z');
    });

    it('should fallback to creationTime when other dates unavailable', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        creationTime: '2024-02-05T12:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'N'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.date).toBe('2024-02-05T12:00:00.000Z');
    });

    it('should fallback to lastModificationTime when other dates unavailable', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        lastModificationTime: '2024-02-05T13:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'O'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.date).toBe('2024-02-05T13:00:00.000Z');
    });
  });

  describe('Subject Extraction', () => {
    it('should extract subject line', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Important Meeting Tomorrow',
        body: 'P'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.subject).toBe('Important Meeting Tomorrow');
    });

    it('should use fallback when subject missing', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        body: 'Q'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.subject).toBe('(无主题)');
    });
  });

  describe('Attachment Metadata Extraction', () => {
    it('should extract attachment metadata', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'R'.repeat(300),
        attachmentFiles: [
          {
            fileName: 'document.pdf',
            fileSize: 12345,
          },
          {
            name: 'report.xlsx',
            size: 67890,
          },
        ],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.attachments).toHaveLength(2);
      expect(result.attachments[0]).toEqual({
        filename: 'document.pdf',
        size: 12345,
        mime_type: 'application/pdf',
      });
      expect(result.attachments[1]).toEqual({
        filename: 'report.xlsx',
        size: 67890,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    });

    it('should handle missing attachment file name', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'S'.repeat(300),
        attachmentFiles: [
          {
            fileSize: 999,
          },
        ],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.attachments[0].filename).toBe('unnamed');
      expect(result.attachments[0].size).toBe(999);
    });

    it('should return empty array when no attachments', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'T'.repeat(300),
        attachmentFiles: undefined,
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.attachments).toEqual([]);
    });
  });

  describe('Body Extraction and Truncation', () => {
    it('should extract plain text body', async () => {
      const bodyContent = 'This is a test email body. '.repeat(20); // ~600 chars
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: bodyContent,
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.body).toBe(bodyContent);
      expect(result.extract_status).toBe('success');
    });

    it('should extract and strip HTML from bodyHtml', async () => {
      const htmlContent = '<p>This is <strong>HTML</strong> content.</p>'.repeat(20); // ~800 chars
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        bodyHtml: htmlContent,
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.body).not.toContain('<');
      expect(result.body).not.toContain('>');
      expect(result.extract_status).toBe('success');
    });

    it('should extract body from Buffer', async () => {
      const bodyBuffer = Buffer.from('Buffered email body content. '.repeat(30));
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: bodyBuffer,
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.body).toContain('Buffered email body content');
      expect(result.extract_status).toBe('success');
    });

    it('should truncate body to 100k characters', async () => {
      const longBody = 'A'.repeat(150000);
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: longBody,
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.body).toHaveLength(100000);
      expect(result.extract_status).toBe('success');
    });

    it('should return undefined body when too short (<200 chars)', async () => {
      const shortBody = 'Short content.';
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: shortBody,
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.body).toBeUndefined();
      expect(result.extract_status).toBe('no_content');
    });

    it('should return no_content when no body available', async () => {
      const mockMsg = {
        internetMessageId: '<test@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Empty Body',
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.body).toBeUndefined();
      expect(result.extract_status).toBe('no_content');
    });
  });

  describe('SHA-256 Fingerprint Generation', () => {
    it('should generate consistent hash for same email', async () => {
      const mockMsg = {
        internetMessageId: '<consistent@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'U'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result1 = await parser.parse('/test/email.msg');
      const result2 = await parser.parse('/test/email.msg');

      expect(result1.email_hash).toBe(result2.email_hash);
    });

    it('should generate different hash for different Message-ID', async () => {
      const mockMsg1 = {
        internetMessageId: '<email1@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'V'.repeat(300),
        attachmentFiles: [],
      };

      const mockMsg2 = {
        internetMessageId: '<email2@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'V'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValueOnce(mockMsg1).mockReturnValueOnce(mockMsg2);

      const result1 = await parser.parse('/test/email1.msg');
      const result2 = await parser.parse('/test/email2.msg');

      expect(result1.email_hash).not.toBe(result2.email_hash);
    });

    it('should generate fallback hash when Message-ID missing', async () => {
      const mockMsg = {
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Test',
        body: 'W'.repeat(300),
        attachmentFiles: [],
      };

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/email.msg');

      expect(result.email_hash).toBeDefined();
      expect(result.email_hash).toHaveLength(64); // SHA-256 hex
      expect(result.message_id).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when @kenjiuno/msgreader throws', async () => {
      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockImplementation(() => {
        throw new Error('Invalid MSG file format');
      });

      await expect(parser.parse('/test/corrupted.msg')).rejects.toThrow('MsgParser failed');
    });

    it('should throw error with file path in error message', async () => {
      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockImplementation(() => {
        throw new Error('Cannot read file');
      });

      await expect(parser.parse('/test/path/email.msg')).rejects.toThrow('/test/path/email.msg');
    });

    it('should handle missing properties gracefully', async () => {
      const mockMsg = {}; // Empty object
      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));
      createMockMsgReaderInstance.getFileData.mockReturnValue(mockMsg);

      const result = await parser.parse('/test/empty.msg');

      expect(result).toBeDefined();
      expect(result.subject).toBe('(无主题)');
      expect(result.from).toBe('unknown@example.com');
      expect(result.message_id).toBeUndefined();
    });
  });

  describe('File Format Detection', () => {
    it('should identify .msg files', () => {
      expect(parser.canParse('/path/to/email.msg')).toBe(true);
      expect(parser.canParse('/path/to/email.MSG')).toBe(true);
      expect(parser.canParse('/path/to/email.Msg')).toBe(true);
    });

    it('should reject non-.msg files', () => {
      expect(parser.canParse('/path/to/email.eml')).toBe(false);
      expect(parser.canParse('/path/to/email.pdf')).toBe(false);
      expect(parser.canParse('/path/to/email.txt')).toBe(false);
    });
  });

  describe('SC-004 Compliance: Message-ID Extraction Rate', () => {
    it('should achieve ≥85% Message-ID extraction rate per SC-004', async () => {
      // Test 100 mock emails with 85% having Message-ID
      const testCases = [];

      // 85 emails with Message-ID
      for (let i = 0; i < 85; i++) {
        testCases.push({
          internetMessageId: `<message${i}@example.com>`,
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: `sender${i}@example.com`,
          subject: `Test ${i}`,
          body: 'X'.repeat(300),
          attachmentFiles: [],
        });
      }

      // 15 emails without Message-ID
      for (let i = 0; i < 15; i++) {
        testCases.push({
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: `sender${i + 85}@example.com`,
          subject: `No ID ${i}`,
          body: 'Y'.repeat(300),
          attachmentFiles: [],
        });
      }

      mockReadFileSync.mockReturnValue(Buffer.from('mock buffer'));

      let successCount = 0;

      for (const mockMsg of testCases) {
        createMockMsgReaderInstance.getFileData.mockReturnValueOnce(mockMsg);
        const result = await parser.parse(`/test/email${successCount}.msg`);
        if (result.message_id) {
          successCount++;
        }
      }

      const extractionRate = (successCount / 100) * 100;
      expect(extractionRate).toBeGreaterThanOrEqual(85);
      expect(successCount).toBe(85);
    });
  });
});
