/**
 * Report display types
 * Per data-model.md section 2
 */

export interface ConfidenceDisplay {
  score: number; // 0.0-1.0
  level: 'high' | 'medium' | 'low';
}

export interface ItemSourceRef {
  hash: string;
  senderName: string;
  senderDomain: string;
  date: string;
  subject: string;
}

export interface ReportDisplayItem {
  itemId: string;
  reportDate: string; // YYYY-MM-DD
  itemType: 'completed' | 'pending';
  content: {
    title: string;
    description: string;
    dueDate: string | null;
    priority: 'high' | 'medium' | 'low';
  };
  confidence: ConfidenceDisplay;
  sourceStatus: 'verified' | 'unverified';
  sourceEmails: ItemSourceRef[];
}
