/**
 * Historical search types
 * Per data-model.md section 5
 */

export interface SearchFilters {
  itemType?: 'completed' | 'pending' | 'all';
  confidenceLevel?: 'high' | 'medium' | 'low';
  hasFeedback?: boolean;
  dateRange?: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SearchQuery {
  keywords: string;
  filters?: SearchFilters;
  pagination: PaginationParams;
}
