export interface ValidationFile {
    path: string;
    fileName: string;
    sizeBytes: number;
    modifiedAt: number;
    readability: 'readable' | 'unreadable';
    reason: string | null;
}

export interface OnboardingStatus {
    completed: boolean;
    currentStep: 1 | 2 | 3;
    readablePstCount: number;
    outlookDirectory: string | null;
}

export interface ValidationResult {
    valid: boolean;
    readablePstCount: number;
    unreadablePstCount: number;
    files: ValidationFile[];
    message: string;
}

export interface ConnectionResult {
    success: boolean;
    responseTimeMs: number | null;
    message: string;
}

export interface EvidenceView {
    evidenceId: string;
    senderDisplay: string;
    subjectSnippet: string;
    sentAt: number | null;
    searchTerm: string;
    filePath: string;
    sourceIdentifier: string;
}

export interface ActionItemView {
    itemId: string;
    title: string;
    content: string;
    itemType: 'todo' | 'completed';
    confidenceScore: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    sourceStatus: 'verified' | 'unverified';
    rationale: string;
    senderDisplay: string;
    sentAt: number | null;
    subjectSnippet: string;
    evidence: EvidenceView[];
}

export interface RunSummary {
    runId: string;
    startedAt: number;
    finishedAt: number | null;
    status: 'pending' | 'running' | 'completed' | 'failed';
    pstCount: number;
    processedEmailCount: number;
    itemCount: number;
    lowConfidenceCount: number;
}

export interface RunDetail extends RunSummary {
    outlookDirectory: string;
    pstFiles: ValidationFile[];
    items: ActionItemView[];
    message: string;
}

export interface SettingsView {
    outlookDirectory: string;
    aiBaseUrl: string;
    aiModel: string;
    databasePath: string;
    databaseSizeBytes: number;
}
