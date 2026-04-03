import { createHash, randomUUID } from 'crypto';

import { PSTFile, type PSTFolder, type PSTMessage } from 'pst-extractor';

import type { ValidationFile } from '@shared/types/app.js';

import PstDiscovery from '../outlook/PstDiscovery.js';
import RunRepository from './RunRepository.js';
import type {
  ParsedPstEmail,
  PersistedActionItemRecord,
  PersistedRunDetail,
  RunExecutionDependencies,
  RunExecutionResult,
} from './runTypes.js';

const COMPLETED_PATTERN = /\b(done|completed|resolved|closed|finished)\b|已完成|完成了|已解决|已关闭/i;
const ACTION_PATTERN =
  /\b(action required|todo|follow up|follow-up|need to|needs to|please|review|reply|respond|confirm|approve|submit|schedule|arrange|send|update|prepare|finish|complete|deadline|due)\b|请|需要|跟进|回复|确认|审批|提交|安排|更新|准备|截止|到期|完成/i;
const STRONG_SIGNAL_PATTERN =
  /\b(action required|todo|follow up|deadline|due|approve|submit|confirm|reply)\b|请|需要|跟进|确认|提交|截止/i;
const LOW_SIGNAL_PATTERN = /\b(review|send|update|prepare|finish)\b|更新|准备|发送/i;
const SUBJECT_PREFIX_PATTERN = /^(?:re|fw|fwd)\s*:\s*/gi;

function normalizeWhitespace(value: string): string {
  return value.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

function cleanSubject(subject: string): string {
  const normalized = normalizeWhitespace(subject.replace(SUBJECT_PREFIX_PATTERN, ''));
  return normalized || '未命名事项';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toTimestamp(value: Date | null | undefined): number | null {
  if (!value || Number.isNaN(value.getTime())) {
    return null;
  }

  return value.getTime();
}

function createFingerprint(
  messageIdentifier: string | null,
  sentAt: number | null,
  senderAddress: string | null,
  subject: string
): string {
  return createHash('sha256')
    .update(`${messageIdentifier ?? 'no-message-id'}|${sentAt ?? 0}|${senderAddress ?? 'unknown'}|${subject}`)
    .digest('hex');
}

function deriveSearchTerm(subject: string, content: string): string {
  const subjectTerm = cleanSubject(subject);
  if (subjectTerm.length >= 8) {
    return subjectTerm;
  }

  const contentTerm = normalizeWhitespace(content).slice(0, 80);
  return contentTerm || subjectTerm;
}

function pickRelevantSentence(email: ParsedPstEmail): string {
  const normalizedBody = normalizeWhitespace(stripHtml(email.body));
  const sentences = normalizedBody
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const prioritized = sentences.find((sentence) => ACTION_PATTERN.test(sentence)) ?? sentences[0];
  const base = prioritized ?? cleanSubject(email.subject);

  return base.length > 220 ? `${base.slice(0, 217)}...` : base;
}

function calculateConfidence(email: ParsedPstEmail, content: string, isCompleted: boolean): number {
  const subject = cleanSubject(email.subject);
  const haystack = `${subject} ${content}`;

  let score = isCompleted ? 0.86 : 0.62;

  if (STRONG_SIGNAL_PATTERN.test(haystack)) {
    score += 0.18;
  } else if (LOW_SIGNAL_PATTERN.test(haystack)) {
    score += 0.06;
  }

  if (email.messageIdentifier) {
    score += 0.04;
  }

  if (content.length < 40) {
    score -= 0.18;
  } else if (content.length > 140) {
    score += 0.03;
  }

  return clamp(Number(score.toFixed(2)), 0.42, 0.96);
}

function toConfidenceLevel(score: number): PersistedActionItemRecord['confidenceLevel'] {
  if (score >= 0.8) {
    return 'high';
  }

  if (score >= 0.6) {
    return 'medium';
  }

  return 'low';
}

function createActionItemFromEmail(email: ParsedPstEmail): PersistedActionItemRecord | null {
  const subject = cleanSubject(email.subject);
  const content = pickRelevantSentence(email);
  const haystack = `${subject} ${content}`;

  if (!ACTION_PATTERN.test(haystack)) {
    return null;
  }

  const itemType: PersistedActionItemRecord['itemType'] = COMPLETED_PATTERN.test(haystack) ? 'completed' : 'todo';
  const confidenceScore = calculateConfidence(email, content, itemType === 'completed');
  const confidenceLevel = toConfidenceLevel(confidenceScore);
  const searchTerm = deriveSearchTerm(subject, content);
  const matchedSignals = [
    STRONG_SIGNAL_PATTERN.test(haystack) ? 'strong-action-signal' : null,
    COMPLETED_PATTERN.test(haystack) ? 'completion-language' : null,
    email.messageIdentifier ? 'message-id-present' : 'fingerprint-fallback',
  ].filter(Boolean);

  return {
    itemId: randomUUID(),
    title: subject,
    content,
    itemType,
    confidenceScore,
    confidenceLevel,
    sourceStatus: confidenceLevel === 'low' ? 'unverified' : 'verified',
    rationale: `Derived from subject/body heuristics: ${matchedSignals.join(', ')}.`,
    senderDisplay: email.senderDisplay,
    sentAt: email.sentAt,
    subjectSnippet: subject,
    evidence: [
      {
        evidenceId: randomUUID(),
        emailId: email.emailId,
        senderDisplay: email.senderDisplay,
        subjectSnippet: subject,
        sentAt: email.sentAt,
        searchTerm,
        filePath: email.filePathHint,
        sourceIdentifier: email.messageIdentifier ?? email.fingerprint,
      },
    ],
  };
}

function mapPstMessage(pstFilePath: string, message: PSTMessage): ParsedPstEmail {
  const subject = message.subject || '未命名事项';
  const body = message.body || message.bodyHTML || subject;
  const senderDisplay = normalizeWhitespace(
    message.senderName || message.sentRepresentingName || message.senderEmailAddress || '未知发件人'
  );
  const senderAddress =
    normalizeWhitespace(
      message.senderEmailAddress || message.sentRepresentingEmailAddress || message.emailAddress || ''
    ) || null;
  const sentAt = toTimestamp(
    message.clientSubmitTime || message.messageDeliveryTime || message.creationTime || message.modificationTime
  );
  const messageIdentifier = normalizeWhitespace(message.internetMessageId || '').replace(/^<|>$/g, '') || null;

  return {
    emailId: randomUUID(),
    pstPath: pstFilePath,
    messageIdentifier,
    fingerprint: createFingerprint(messageIdentifier, sentAt, senderAddress, subject),
    senderDisplay,
    senderAddress,
    subject,
    body: normalizeWhitespace(stripHtml(String(body))),
    sentAt,
    messageClass: message.messageClass || 'IPM.Note',
    filePathHint: pstFilePath,
  };
}

export class RunExecutionService {
  private static activeRunPromise: Promise<RunExecutionResult> | null = null;

  constructor(private readonly dependencies: RunExecutionDependencies = {}) {}

  async start(): Promise<RunExecutionResult> {
    if (RunExecutionService.activeRunPromise) {
      return {
        success: false,
        runId: null,
        message: '已有扫描任务正在执行，请等待当前任务完成。',
      };
    }

    const promise = this.execute();
    RunExecutionService.activeRunPromise = promise;

    try {
      return await promise;
    } finally {
      if (RunExecutionService.activeRunPromise === promise) {
        RunExecutionService.activeRunPromise = null;
      }
    }
  }

  private async execute(): Promise<RunExecutionResult> {
    const loadSettings = this.dependencies.loadSettings ?? (() => RunRepository.getSettingsSeed());
    const validateDirectory =
      this.dependencies.validateDirectory ?? ((directoryPath: string) => PstDiscovery.validateDirectory(directoryPath));
    const loadPstEmails = this.dependencies.loadPstEmails ?? ((pstFile: ValidationFile) => this.loadEmailsFromPst(pstFile));
    const saveRun = this.dependencies.saveRun ?? ((run: PersistedRunDetail) => RunRepository.saveRun(run));
    const now = this.dependencies.now ?? (() => Date.now());

    const settings = await loadSettings();
    const validation = validateDirectory(settings.outlookDirectory);

    if (!validation.valid) {
      return {
        success: false,
        runId: null,
        message: validation.message,
      };
    }

    const readablePstFiles = validation.files.filter((file) => file.readability === 'readable');
    const startedAt = now();
    const parsedEmails: ParsedPstEmail[] = [];
    const parserErrors: string[] = [];

    for (const pstFile of readablePstFiles) {
      try {
        const emails = await loadPstEmails(pstFile);
        parsedEmails.push(...emails);
      } catch (error) {
        parserErrors.push(`${pstFile.fileName}: ${error instanceof Error ? error.message : '未知 PST 解析错误'}`);
      }
    }

    const dedupedItems = new Map<string, PersistedActionItemRecord>();
    for (const email of parsedEmails) {
      const item = createActionItemFromEmail(email);
      if (!item) {
        continue;
      }

      const dedupeKey = `${item.title.toLowerCase()}|${item.itemType}|${item.evidence[0]?.sourceIdentifier ?? email.fingerprint}`;
      if (!dedupedItems.has(dedupeKey)) {
        dedupedItems.set(dedupeKey, item);
      }
    }

    const items = Array.from(dedupedItems.values()).sort((left, right) => (right.sentAt ?? 0) - (left.sentAt ?? 0));
    const processedEmails = parsedEmails.map((email) => ({
      emailId: email.emailId,
      pstPath: email.pstPath,
      messageIdentifier: email.messageIdentifier,
      fingerprint: email.fingerprint,
      senderDisplay: email.senderDisplay,
      senderAddress: email.senderAddress,
      subject: cleanSubject(email.subject),
      sentAt: email.sentAt,
      filePathHint: email.filePathHint,
    }));

    const status: PersistedRunDetail['status'] =
      processedEmails.length === 0 && parserErrors.length > 0 ? 'failed' : 'completed';
    const runId = randomUUID();
    const lowConfidenceCount = items.filter((item) => item.confidenceLevel === 'low').length;
    const finishedAt = now();
    const summaryMessage =
      status === 'failed'
        ? `扫描失败，未能从 ${readablePstFiles.length} 个 PST 中读取邮件。`
        : `扫描完成，处理 ${processedEmails.length} 封邮件，提取 ${items.length} 条事项。`;

    const run: PersistedRunDetail = {
      runId,
      startedAt,
      finishedAt,
      status,
      pstCount: readablePstFiles.length,
      processedEmailCount: processedEmails.length,
      itemCount: items.length,
      lowConfidenceCount,
      outlookDirectory: settings.outlookDirectory,
      pstFiles: readablePstFiles,
      processedEmails,
      items,
      message: parserErrors.length > 0 ? `${summaryMessage} 部分 PST 解析失败。` : summaryMessage,
      errorMessage: parserErrors.length > 0 ? parserErrors.join(' | ') : null,
    };

    await saveRun(run);

    return {
      success: status !== 'failed',
      runId,
      message: run.message,
    };
  }

  private async loadEmailsFromPst(pstFile: ValidationFile): Promise<ParsedPstEmail[]> {
    const pst = new PSTFile(pstFile.path);

    try {
      const emails: ParsedPstEmail[] = [];
      this.walkFolder(pstFile.path, pst.getRootFolder(), emails);
      return emails;
    } finally {
      pst.close();
    }
  }

  private walkFolder(pstFilePath: string, folder: PSTFolder, sink: ParsedPstEmail[]): void {
    if (folder.hasSubfolders) {
      for (const childFolder of folder.getSubFolders()) {
        this.walkFolder(pstFilePath, childFolder, sink);
      }
    }

    if (folder.contentCount <= 0) {
      return;
    }

    folder.moveChildCursorTo(0);

    let child = folder.getNextChild() as PSTMessage | null;
    while (child) {
      const messageClass = child.messageClass || '';
      if (messageClass.startsWith('IPM.Note') || messageClass.startsWith('IPM.Task')) {
        sink.push(mapPstMessage(pstFilePath, child));
      }

      child = folder.getNextChild() as PSTMessage | null;
    }
  }
}

export default RunExecutionService;
