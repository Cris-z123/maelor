export interface MvpValidationFile {
  path: string;
  fileName: string;
  sizeBytes: number;
  modifiedAt: number;
  readability: 'readable' | 'unreadable';
  reason: string | null;
}

export interface MvpOnboardingStatus {
  completed: boolean;
  currentStep: 1 | 2 | 3;
  readablePstCount: number;
  outlookDirectory: string | null;
}

export interface MvpValidationResult {
  valid: boolean;
  readablePstCount: number;
  unreadablePstCount: number;
  files: MvpValidationFile[];
  message: string;
}

export interface MvpConnectionResult {
  success: boolean;
  responseTimeMs: number | null;
  message: string;
}

export interface MvpEvidenceView {
  evidenceId: string;
  senderDisplay: string;
  subjectSnippet: string;
  sentAt: number | null;
  searchTerm: string;
  filePath: string;
  sourceIdentifier: string;
}

export interface MvpActionItemView {
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
  evidence: MvpEvidenceView[];
}

export interface MvpRunSummary {
  runId: string;
  startedAt: number;
  finishedAt: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pstCount: number;
  processedEmailCount: number;
  itemCount: number;
  lowConfidenceCount: number;
}

export interface MvpRunDetail extends MvpRunSummary {
  outlookDirectory: string;
  pstFiles: MvpValidationFile[];
  items: MvpActionItemView[];
  message: string;
}

export interface MvpSettingsView {
  outlookDirectory: string;
  aiBaseUrl: string;
  aiModel: string;
  databasePath: string;
  databaseSizeBytes: number;
}
