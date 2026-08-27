import type { EvidenceRecordStatus } from './evidence-methodology.ts';
import type { SourceContentLevel, SourceIntakeDecisionType, SourceIntakeReason } from './source-document.ts';

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
  intakeDecision: SourceIntakeDecisionType;
  intakeReasons: SourceIntakeReason[];
  policyVersion: string;
  lastCheckedAt: string;
  revalidationDueAt: string;
}

export interface SourceReviewQueueResult {
  sources: SourceReviewQueueItem[];
  generatedAt: string;
  revalidationIntervalDays: number;
}
