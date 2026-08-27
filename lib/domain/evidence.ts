export type Confidence = 'high' | 'moderate' | 'low' | 'insufficient';
export type ReviewDecision = 'approved' | 'needs_review' | 'rejected';
export type EvidenceDirection = 'supporting' | 'neutral' | 'contradicting';

export interface Provenance {
  sourceId: string;
  chunkId: string;
  locator: string;
  quoteHash: string;
}

export interface SourceAssessment {
  sourceId: string;
  relevance: number;
  studyDesign: string;
  population: string;
  intervention?: string;
  comparator?: string;
  outcomes: string[];
  limitations: string[];
  riskOfBias: 'low' | 'some_concerns' | 'high' | 'not_applicable';
  provenance: Provenance[];
  decision: ReviewDecision;
}

export interface ClaimEvidence {
  direction: EvidenceDirection;
  weight: 'primary' | 'secondary' | 'context';
  provenance: Provenance;
}

export interface ClaimVersion {
  claimId: string;
  version: number;
  statement: string;
  scope: {
    population: string;
    intervention?: string;
    comparator?: string;
    outcome?: string;
    timeframe?: string;
  };
  confidence: Confidence;
  limitations: string[];
  evidence: ClaimEvidence[];
  status: ReviewDecision | 'superseded';
  reviewedAt: string;
  reviewDueAt: string;
}
