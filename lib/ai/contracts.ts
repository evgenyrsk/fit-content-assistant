export type Confidence = 'high' | 'moderate' | 'low' | 'insufficient';
export type ReviewDecision = 'approved' | 'needs_review' | 'rejected';
export type EvidenceDirection = 'supporting' | 'neutral' | 'contradicting';
export type ContentFormat = 'reels' | 'telegram' | 'threads' | 'carousel';

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

export interface ContentBrief {
  format: ContentFormat;
  audience: string;
  coreIdea: string;
  tension: string;
  practicalValue: string;
  requiredClaimVersionIds: string[];
  requiredCaveats: string[];
  prohibitedFramings: string[];
  styleProfileVersion: string;
}

export interface ContentFragment {
  id: string;
  text: string;
  kind: 'fact' | 'opinion' | 'illustration' | 'transition' | 'cta';
  claimVersionIds: string[];
}

export interface ContentDraft {
  format: ContentFormat;
  title: string;
  fragments: ContentFragment[];
  reviewDecision: ReviewDecision;
  reviewNotes: string[];
}

export interface ModelRunRecord {
  runId: string;
  stage: PipelineStageId;
  model: string;
  promptVersion: string;
  startedAt: string;
  retrievedIds: string[];
  toolCalls: string[];
  decision: ReviewDecision;
}

export type PipelineStageId =
  | 'intent'
  | 'research_plan'
  | 'retrieval'
  | 'source_assessment'
  | 'claim_synthesis'
  | 'claim_review'
  | 'knowledge_commit'
  | 'content_brief'
  | 'platform_draft'
  | 'voice_edit'
  | 'fact_review';
