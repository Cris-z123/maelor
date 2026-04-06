import type { ActionItemView, EvidenceView, RunDetail, ValidationFile } from '@shared/types/app.js';

export interface ProcessedEmailRecord {
    emailId: string;
    pstPath: string;
    messageIdentifier: string | null;
    fingerprint: string;
    senderDisplay: string;
    senderAddress: string | null;
    subject: string;
    sentAt: number | null;
    filePathHint: string;
}

export interface PersistedEvidenceRecord extends EvidenceView {
    emailId: string | null;
}

export interface PersistedActionItemRecord extends Omit<ActionItemView, 'evidence'> {
    evidence: PersistedEvidenceRecord[];
}

export interface PersistedRunDetail extends Omit<RunDetail, 'items'> {
    items: PersistedActionItemRecord[];
    processedEmails: ProcessedEmailRecord[];
    errorMessage?: string | null;
}

export interface ParsedPstEmail {
    emailId: string;
    pstPath: string;
    messageIdentifier: string | null;
    fingerprint: string;
    senderDisplay: string;
    senderAddress: string | null;
    subject: string;
    body: string;
    sentAt: number | null;
    messageClass: string;
    filePathHint: string;
}

export interface RunSettingsSeed {
    outlookDirectory: string;
    aiBaseUrl: string;
    aiModel: string;
}

export interface RunExecutionResult {
    success: boolean;
    runId: string | null;
    message: string;
}

export interface RunExecutionDependencies {
    now?: () => number;
    loadSettings?: () => Promise<RunSettingsSeed>;
    validateDirectory?: (directoryPath: string) => {
        valid: boolean;
        readablePstCount: number;
        unreadablePstCount: number;
        files: ValidationFile[];
        message: string;
    };
    loadPstEmails?: (pstFile: ValidationFile) => Promise<ParsedPstEmail[]>;
    saveRun?: (run: PersistedRunDetail) => Promise<void>;
}
