import type { StudyGateDecision } from './evidence-methodology.ts';

export type EvidenceReviewDecision = 'confirmed' | 'rejected' | 'needs_more_information';

export interface SourceAssessmentReviewContext {
  assessmentId: string;
  researchRunId: string;
  sourceId: string;
  modelDecision: StudyGateDecision;
}

export interface SourceAssessmentHumanReview {
  id: string;
  assessmentId: string;
  decision: EvidenceReviewDecision;
  findingChecked: boolean;
  provenanceChecked: boolean;
  scopeChecked: boolean;
  reason: string;
  reviewerId: string;
  createdAt: string;
}

export interface BodyAssessmentReviewContext {
  bodyAssessmentId: string;
  researchRunId: string;
}

export interface BodyAssessmentHumanReview {
  id: string;
  bodyAssessmentId: string;
  decision: EvidenceReviewDecision;
  evidenceSetChecked: boolean;
  contradictionsChecked: boolean;
  certaintyChecked: boolean;
  scopeChecked: boolean;
  reason: string;
  reviewerId: string;
  createdAt: string;
}

export function effectiveStudyDecision(
  modelDecision: StudyGateDecision,
  humanDecision?: EvidenceReviewDecision,
): StudyGateDecision {
  if (modelDecision === 'excluded' || modelDecision === 'context_only') return modelDecision;
  if (humanDecision === 'confirmed') return 'eligible_for_synthesis';
  if (humanDecision === 'rejected') return 'context_only';
  return 'needs_human_review';
}
