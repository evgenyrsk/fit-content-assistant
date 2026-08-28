import type { Confidence, EvidenceDirection } from './evidence.ts';

export interface ClaimDraftEvidence {
  sourceAssessmentId?: string;
  sourceChunkId: string;
  direction: EvidenceDirection;
  weight: 'primary' | 'secondary' | 'context';
}

export interface ClaimDraftRecord {
  id: string;
  stableKey: string;
  topic: string;
  statement: string;
  scope: {
    population: string;
    intervention: string | null;
    comparator: string | null;
    outcome: string;
    timeframe: string | null;
  };
  confidence: Confidence;
  limitations: string[];
  evidence: ClaimDraftEvidence[];
  status: 'needs_review';
  reviewDueAt: string;
  methodologyVersion: string;
  createdAt: string;
}

export interface SavedClaimVersion {
  claimId: string;
  versionId: string;
  version: number;
}
