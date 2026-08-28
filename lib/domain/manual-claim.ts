import type { ClaimDraftEvidence } from './claim-draft.ts';
import type { Confidence, ReviewDecision } from './evidence.ts';
import type { KnowledgeClaimRecord } from './knowledge.ts';
import type { SourceChunkKind } from './source-document.ts';

export interface ManualEvidenceOption {
  sourceChunkId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  kind: SourceChunkKind;
  locator: string;
  excerpt: string;
}

export interface ManualClaimDraftInput {
  topic: string;
  statement: string;
  population: string;
  intervention?: string;
  comparator?: string;
  outcome: string;
  timeframe?: string;
  confidence: Confidence;
  limitations: string[];
  evidence: ClaimDraftEvidence[];
  reviewDueAt: string;
}

export interface ManualClaimEvidenceTrace extends ManualEvidenceOption {
  direction: ClaimDraftEvidence['direction'];
  weight: ClaimDraftEvidence['weight'];
  eligibleForApproval: boolean;
}

export interface ManualClaimReviewContext {
  claim: KnowledgeClaimRecord;
  evidence: ManualClaimEvidenceTrace[];
}

export interface ManualClaimReviewInput {
  decision: Extract<ReviewDecision, 'approved' | 'rejected'>;
  reason: string;
  contradictoryEvidenceNote: string;
  provenanceChecked: boolean;
  scopeChecked: boolean;
  contradictionsChecked: boolean;
}

export interface ManualClaimReviewRecord extends ManualClaimReviewInput {
  id: string;
  claimVersionId: string;
  reviewerId: 'owner';
  createdAt: string;
}
