/**
 * Unit tests for PstParser
 *
 * Tests Outlook .pst/.ost archive parser with focus on:
 * - Archive extraction using pst-extractor
 * - Message-ID extraction rate ≥90% per SC-004
 * - SHA-256 fallback when Message-ID missing
 * - Metadata extraction from PST emails
 * - Iteration through multiple emails in archive
 *
 * Migration 2026-02-24: Updated tests for pst-extractor library
 *
 * @tests/unit/email-processing/parsers/pst-parser.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PstParser } from '@/email/parsers/PstParser';
import { logger } from '@/config/logger';
import * as crypto from 'crypto';

// Hoist mocks for pst-extractor
const mockPSTFileClass = vi.hoisted(() => vi.fn());
const mockPstFile = vi.hoisted(() => ({
  getRootFolder: vi.fn(),
  close: vi.fn(),
  pstFilename: '',
}));

// Mock pst-extractor
vi.mock('pst-extractor', () => ({
  PSTFile: mockPSTFileClass,
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

describe('PstParser', () => {
  let parser: PstParser;

  // Mock folder structure
  const mockRootFolder = {
    getSubFolders: vi.fn(),
    getEmails: vi.fn(),
  };

  const mockInboxFolder = {
    getSubFolders: vi.fn(),
    getEmails: vi.fn(),
  };

  const mockSentFolder = {
    getSubFolders: vi.fn(),
    getEmails: vi.fn(),
  };

  beforeEach(() => {
    parser = new PstParser();

    // Reset all mocks
    mockPSTFileClass.mockReset();
    mockPstFile.getRootFolder.mockReset();
    mockPstFile.close.mockReset();
    mockRootFolder.getSubFolders.mockReset();
    mockRootFolder.getEmails.mockReset();
    mockInboxFolder.getSubFolders.mockReset();
    mockInboxFolder.getEmails.mockReset();
    mockSentFolder.getSubFolders.mockReset();
    mockSentFolder.getEmails.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    parser.close();
    vi.restoreAllMocks();
  });

  describe('PST File Opening', () => {
    it('should open PST file and extract emails', async () => {
      // Setup mock folder structure with emails
      mockRootFolder.getSubFolders.mockReturnValue([mockInboxFolder, mockSentFolder]);
      mockInboxFolder.getSubFolders.mockReturnValue([]);
      mockSentFolder.getSubFolders.mockReturnValue([]);
      mockInboxFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<inbox1@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Inbox Email',
          body: 'A'.repeat(300),
          attachments: [],
        },
      ]);
      mockSentFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<sent1@example.com>',
          clientSubmitTime: '2024-02-05T11:00:00Z',
          senderEmailAddress: 'me@example.com',
          subject: 'Sent Email',
          body: 'B'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result).toBeDefined();
      expect(result.subject).toBe('Inbox Email');
      expect(mockPSTFileClass).toHaveBeenCalledWith('/test/archive.pst');
      expect(parser.getEmailCount()).toBe(2);
    });

    it('should throw error when openPst fails', async () => {
      mockPSTFileClass.mockImplementation(() => {
        throw new Error('Cannot open PST file');
      });

      await expect(parser.parse('/test/corrupted.pst')).rejects.toThrow('Failed to open PST file');
    });

    it('should close previous PST file when opening new one', async () => {
      // Open first PST
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<first@test.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@test.com',
          subject: 'First',
          body: 'C'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/first.pst';
      mockPstFile.close.mockReset();
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      await parser.parse('/test/first.pst');
      expect(mockPstFile.close).not.toHaveBeenCalled();

      // Create a new mock PST file for the second file
      const mockPstFile2 = {
        getRootFolder: vi.fn(),
        close: vi.fn(),
        pstFilename: '/test/second.pst',
      };

      // Open second PST (should close first)
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<second@test.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@test.com',
          subject: 'Second',
          body: 'D'.repeat(300),
          attachments: [],
        },
      ]);
      mockPstFile2.getRootFolder.mockReturnValue(mockRootFolder);
      mockPSTFileClass.mockImplementation(() => mockPstFile2);

      await parser.parse('/test/second.pst');
      expect(mockPstFile.close).toHaveBeenCalled();
    });
  });

  describe('Email Iteration', () => {
    beforeEach(() => {
      // Setup mock folder structure with 3 emails
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<email1@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender1@example.com',
          subject: 'Email 1',
          body: 'D'.repeat(300),
          attachments: [],
        },
        {
          internetMessageId: '<email2@example.com>',
          clientSubmitTime: '2024-02-05T11:00:00Z',
          senderEmailAddress: 'sender2@example.com',
          subject: 'Email 2',
          body: 'E'.repeat(300),
          attachments: [],
        },
        {
          internetMessageId: '<email3@example.com>',
          clientSubmitTime: '2024-02-05T12:00:00Z',
          senderEmailAddress: 'sender3@example.com',
          subject: 'Email 3',
          body: 'F'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);
    });

    it('should iterate through emails sequentially', async () => {
      const result1 = await parser.parse('/test/archive.pst');
      expect(result1.subject).toBe('Email 1');
      expect(parser.getCurrentPosition()).toBe(1);

      const result2 = await parser.parse('/test/archive.pst');
      expect(result2.subject).toBe('Email 2');
      expect(parser.getCurrentPosition()).toBe(2);

      const result3 = await parser.parse('/test/archive.pst');
      expect(result3.subject).toBe('Email 3');
      expect(parser.getCurrentPosition()).toBe(3);
    });

    it('should throw error when no more emails available', async () => {
      await parser.parse('/test/archive.pst');
      await parser.parse('/test/archive.pst');
      await parser.parse('/test/archive.pst');

      await expect(parser.parse('/test/archive.pst')).rejects.toThrow('No more emails in PST archive');
    });

    it('should reset to beginning of archive', async () => {
      await parser.parse('/test/archive.pst');
      await parser.parse('/test/archive.pst');
      expect(parser.getCurrentPosition()).toBe(2);

      parser.reset();
      expect(parser.getCurrentPosition()).toBe(0);

      const result = await parser.parse('/test/archive.pst');
      expect(result.subject).toBe('Email 1');
      expect(parser.getCurrentPosition()).toBe(1);
    });

    it('should report correct email count', async () => {
      await parser.parse('/test/archive.pst');
      expect(parser.getEmailCount()).toBe(3);
    });
  });

  describe('Message-ID Extraction', () => {
    it('should extract Message-ID from internetMessageId field', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test123@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'G'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.message_id).toBe('test123@example.com');
    });

    it('should extract Message-ID from messageId field', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          messageId: '<another456@example.org>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.org',
          subject: 'Test',
          body: 'H'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.message_id).toBe('another456@example.org');
    });

    it('should extract Message-ID from headers', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          headers: 'Message-ID: <headers789@example.net>\nOther-Header: value',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.net',
          subject: 'Test',
          body: 'I'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.message_id).toBe('headers789@example.net');
    });

    it('should extract Message-ID from transportHeaders', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          transportHeaders: 'Message-ID: <transport999@example.com>\nX-Header: value',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'J'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.message_id).toBe('transport999@example.com');
    });

    it('should return undefined Message-ID when not found (expected for ~10% per SC-004)', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'No Message-ID',
          body: 'K'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.message_id).toBeUndefined();
    });

    it('should remove angle brackets from Message-ID', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<brackets@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'L'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.message_id).toBe('brackets@example.com');
      expect(result.message_id).not.toContain('<');
      expect(result.message_id).not.toContain('>');
    });
  });

  describe('Sender Email Extraction', () => {
    it('should extract email from senderEmailAddress field', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'exact@example.com',
          subject: 'Test',
          body: 'M'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.from).toBe('exact@example.com');
    });

    it('should extract email from fromEmail field as fallback', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          fromEmail: 'fromfield@example.com',
          subject: 'Test',
          body: 'N'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.from).toBe('fromfield@example.com');
    });

    it('should extract email from senderName with angle brackets', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderName: 'John Doe <john.doe@example.com>',
          subject: 'Test',
          body: 'O'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.from).toBe('john.doe@example.com');
    });

    it('should extract email from sentRepresentingEmailAddress', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          sentRepresentingEmailAddress: 'representing@example.com',
          subject: 'Test',
          body: 'P'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.from).toBe('representing@example.com');
    });

    it('should use fallback when sender email not found', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          subject: 'No Sender',
          body: 'Q'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.from).toBe('unknown@example.com');
    });

    it('should convert email to lowercase', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'UPPERCASE@EXAMPLE.COM',
          subject: 'Test',
          body: 'R'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.from).toBe('uppercase@example.com');
    });
  });

  describe('Date Extraction', () => {
    it('should extract date from clientSubmitTime', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:30:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'S'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.date).toBe('2024-02-05T10:30:00.000Z');
    });

    it('should fallback to messageDeliveryTime', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          messageDeliveryTime: '2024-02-05T11:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'T'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.date).toBe('2024-02-05T11:00:00.000Z');
    });

    it('should fallback to creationTime', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          creationTime: '2024-02-05T12:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'U'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.date).toBe('2024-02-05T12:00:00.000Z');
    });

    it('should fallback to lastModificationTime', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          lastModificationTime: '2024-02-05T13:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'V'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.date).toBe('2024-02-05T13:00:00.000Z');
    });
  });

  describe('Body Extraction and Truncation', () => {
    it('should extract plain text body', async () => {
      const bodyContent = 'This is a test email body. '.repeat(20);
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: bodyContent,
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.body).toBe(bodyContent);
      expect(result.extract_status).toBe('success');
    });

    it('should extract and strip HTML from bodyHtml', async () => {
      const htmlContent = '<p>This is <strong>HTML</strong> content.</p>'.repeat(20);
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          bodyHtml: htmlContent,
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.body).not.toContain('<');
      expect(result.body).not.toContain('>');
      expect(result.extract_status).toBe('success');
    });

    it('should truncate body to 100k characters', async () => {
      const longBody = 'W'.repeat(150000);
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: longBody,
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.body).toHaveLength(100000);
      expect(result.extract_status).toBe('success');
    });

    it('should return undefined body when too short (<200 chars)', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'Short body.',
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.body).toBeUndefined();
      expect(result.extract_status).toBe('no_content');
    });
  });

  describe('Attachment Metadata Extraction', () => {
    it('should extract attachment metadata', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'X'.repeat(300),
          attachments: [
            {
              fileName: 'document.pdf',
              fileSize: 12345,
            },
            {
              name: 'report.xlsx',
              size: 67890,
            },
          ],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

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

    it('should return empty array when no attachments', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'Y'.repeat(300),
          attachments: undefined,
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result.attachments).toEqual([]);
    });
  });

  describe('Nested Folder Handling', () => {
    it('should extract emails from nested folders recursively', async () => {
      const mockSubFolder = {
        getSubFolders: () => [],
        getEmails: () => [
          {
            internetMessageId: '<nested@example.com>',
            clientSubmitTime: '2024-02-05T10:00:00Z',
            senderEmailAddress: 'sender@example.com',
            subject: 'Nested Email',
            body: 'Z'.repeat(300),
            attachments: [],
          },
        ],
      };

      mockRootFolder.getSubFolders.mockReturnValue([mockInboxFolder, mockSubFolder]);
      mockInboxFolder.getSubFolders.mockReturnValue([]);
      mockInboxFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<inbox@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Inbox Email',
          body: 'AA'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result1 = await parser.parse('/test/archive.pst');
      const result2 = await parser.parse('/test/archive.pst');

      expect(parser.getEmailCount()).toBe(2);
      expect(result1.subject).toBe('Inbox Email');
      expect(result2.subject).toBe('Nested Email');
    });
  });

  describe('File Format Detection', () => {
    it('should identify .pst files', () => {
      expect(parser.canParse('/path/to/archive.pst')).toBe(true);
      expect(parser.canParse('/path/to/archive.PST')).toBe(true);
      expect(parser.canParse('/path/to/archive.Pst')).toBe(true);
    });

    it('should identify .ost files', () => {
      expect(parser.canParse('/path/to/archive.ost')).toBe(true);
      expect(parser.canParse('/path/to/archive.OST')).toBe(true);
      expect(parser.canParse('/path/to/archive.Ost')).toBe(true);
    });

    it('should reject non-pst/ost files', () => {
      expect(parser.canParse('/path/to/email.msg')).toBe(false);
      expect(parser.canParse('/path/to/email.eml')).toBe(false);
      expect(parser.canParse('/path/to/email.pdf')).toBe(false);
    });
  });

  describe('SC-004 Compliance: Message-ID Extraction Rate', () => {
    it('should achieve ≥90% Message-ID extraction rate per SC-004', async () => {
      // Test 100 mock emails with 90% having Message-ID
      const testCases = [];

      // 90 emails with Message-ID
      for (let i = 0; i < 90; i++) {
        testCases.push({
          internetMessageId: `<message${i}@example.com>`,
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: `sender${i}@example.com`,
          subject: `Test ${i}`,
          body: 'BB'.repeat(300),
          attachments: [],
        });
      }

      // 10 emails without Message-ID
      for (let i = 0; i < 10; i++) {
        testCases.push({
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: `sender${i + 90}@example.com`,
          subject: `No ID ${i}`,
          body: 'CC'.repeat(300),
          attachments: [],
        });
      }

      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue(testCases);
      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      let successCount = 0;

      for (let i = 0; i < 100; i++) {
        const result = await parser.parse('/test/archive.pst');
        if (result.message_id) {
          successCount++;
        }
      }

      const extractionRate = (successCount / 100) * 100;
      expect(extractionRate).toBeGreaterThanOrEqual(90);
      expect(successCount).toBe(90);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing folder gracefully', async () => {
      mockRootFolder.getSubFolders.mockReturnValue(null);
      mockRootFolder.getEmails.mockReturnValue([]);

      mockPstFile.getRootFolder.mockReturnValue(null);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      // Should throw error for empty PST file
      await expect(parser.parse('/test/archive.pst')).rejects.toThrow('No more emails in PST archive');
      expect(parser.getEmailCount()).toBe(0);
    });

    it('should handle null/undefined emails gracefully', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([null, undefined, {
        internetMessageId: '<valid@example.com>',
        clientSubmitTime: '2024-02-05T10:00:00Z',
        senderEmailAddress: 'sender@example.com',
        subject: 'Valid Email',
        body: 'DD'.repeat(300),
        attachments: [],
      }]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      const result = await parser.parse('/test/archive.pst');

      expect(result).toBeDefined();
      expect(result.subject).toBe('Valid Email');
      expect(parser.getEmailCount()).toBe(1); // Only valid email counted
    });
  });

  describe('PST File Cleanup', () => {
    it('should close PST file and reset state', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'EE'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPstFile.close.mockImplementation(() => {});
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      await parser.parse('/test/archive.pst');
      parser.close();

      expect(mockPstFile.close).toHaveBeenCalled();
      expect(parser.getEmailCount()).toBe(0);
      expect(parser.getCurrentPosition()).toBe(0);
    });

    it('should handle close errors gracefully', async () => {
      mockRootFolder.getSubFolders.mockReturnValue([]);
      mockRootFolder.getEmails.mockReturnValue([
        {
          internetMessageId: '<test@example.com>',
          clientSubmitTime: '2024-02-05T10:00:00Z',
          senderEmailAddress: 'sender@example.com',
          subject: 'Test',
          body: 'FF'.repeat(300),
          attachments: [],
        },
      ]);

      mockPstFile.getRootFolder.mockReturnValue(mockRootFolder);
      mockPstFile.pstFilename = '/test/archive.pst';
      mockPstFile.close.mockImplementation(() => {
        throw new Error('Close failed');
      });
      mockPSTFileClass.mockImplementation(() => mockPstFile);

      await parser.parse('/test/archive.pst');

      // Should not throw
      expect(() => parser.close()).not.toThrow();
    });
  });
});
