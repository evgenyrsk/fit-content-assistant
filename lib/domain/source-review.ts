import type { EvidenceRecordStatus } from './evidence-methodology.ts';
import type { ManualPdfProcessingStatus, ManualPdfRightsBasis } from './manual-source-import.ts';
import type { SourceContentLevel, SourceIntakeDecisionType, SourceIntakeReason } from './source-document.ts';

export type HumanSourceReviewDecision = 'included' | 'excluded' | 'needs_follow_up';

export interface HumanSourceReview {
  id: string;
  decision: HumanSourceReviewDecision;
  reason: string;
  reviewerId: string;
  createdAt: string;
  overridesIntake: boolean;
}

export interface SourceReviewSubmission {
  sourceId: string;
  decision: HumanSourceReviewDecision;
  reason: string;
  reviewerId: string;
}

export interface SourceRevalidationCandidate {
  sourceId: string;
  pmid: string;
  previousRecordStatus: EvidenceRecordStatus;
}

export interface SourceRevalidationResult {
  checked: number;
  changed: number;
  unavailable: number;
  completedAt: string;
}

export interface SourceReviewQueueItem {
  sourceId: string;
  researchRunId: string;
  researchQuery: string;
  title: string;
  url: string;
  pmid?: string;
  pmcid?: string;
  sourceType: string;
  recordStatus: EvidenceRecordStatus;
  contentLevel: SourceContentLevel;
  license?: string;
  manualUpload?: {
    fileName: string;
    byteSize: number;
    pageCount: number;
    extractedCharacters: number;
    rightsBasis: ManualPdfRightsBasis;
    processingStatus: ManualPdfProcessingStatus;
  };
  intakeDecision: SourceIntakeDecisionType;
  intakeReasons: SourceIntakeReason[];
  policyVersion: string;
  humanReview?: HumanSourceReview;
  lastCheckedAt: string;
  revalidationDueAt: string;
}

export interface SourceReviewQueueResult {
  sources: SourceReviewQueueItem[];
  generatedAt: string;
  revalidationIntervalDays: number;
}
