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

export interface ResearchPlanDraft {
  normalizedQuestion: string;
  questionType: import('./evidence-methodology.ts').EvidenceQuestionType;
  population: string;
  intervention: string | null;
  comparator: string | null;
  outcomes: string[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  disconfirmingEvidence: string[];
  searchQuery: string;
  ambiguities: string[];
}

export type ResearchPlanningMode = 'model_draft' | 'deterministic_fallback' | 'awaiting_provider';

export interface ResearchPlanningTrace {
  mode: ResearchPlanningMode;
  searchQuery: string;
  promptVersion: string;
  reviewRequired: true;
  provider?: string;
  model?: string;
  draft?: ResearchPlanDraft;
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
  planning?: ResearchPlanningTrace;
}
