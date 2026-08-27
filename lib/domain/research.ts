export type ScientificSourceProvider = 'pubmed' | 'crossref';

export interface ScientificSourceCandidate {
  id: string;
  provider: ScientificSourceProvider;
  title: string;
  authors: string[];
  journal?: string;
  publishedAt?: string;
  doi?: string;
  pmid?: string;
  url: string;
  sourceType: string;
  discoveredAt: string;
}

export interface ResearchSearchResult {
  runId: string;
  query: string;
  status: 'needs_review' | 'failed';
  candidates: ScientificSourceCandidate[];
  searchedProviders: ScientificSourceProvider[];
  unavailableProviders: ScientificSourceProvider[];
  warnings: string[];
  completedAt: string;
}
