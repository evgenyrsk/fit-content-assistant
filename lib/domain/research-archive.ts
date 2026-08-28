export interface ResearchArchiveItem {
  id: string;
  query: string;
  mode: string;
  status: 'working' | 'needs_review' | 'complete' | 'failed';
  sourceCount: number;
  assessmentCount: number;
  claimCount: number;
  startedAt: string;
  completedAt?: string;
}

export interface ResearchArchiveResult {
  items: ResearchArchiveItem[];
  canonical: true;
  generatedAt: string;
}
