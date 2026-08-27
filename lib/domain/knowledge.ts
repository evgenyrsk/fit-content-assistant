import type { Confidence, ReviewDecision } from './evidence.ts';

export interface KnowledgeClaimRecord {
  id: string;
  claimId: string;
  version: number;
  statement: string;
  topic: string;
  scope: Record<string, string | undefined>;
  confidence: Confidence;
  limitations: string[];
  status: ReviewDecision | 'superseded';
  evidenceCount: number;
  sourceTypes: string[];
  reviewDueAt: string;
  createdAt: string;
}

export interface KnowledgeClaimResult {
  claims: KnowledgeClaimRecord[];
  canonical: true;
  generatedAt: string;
}
