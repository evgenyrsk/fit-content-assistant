import type { AppraisalRoute, StudyAssessmentInput, StudyGateResult } from './evidence-methodology.ts';

export interface SourceReadingBrief {
  plainLanguageSummary: string;
  keyPoints: Array<{
    type: 'main_result' | 'method' | 'limitation';
    statement: string;
    provenanceIds: string[];
  }>;
  conclusionAllowed: string;
  conclusionNotAllowed: string;
}

export interface SourceAssessmentRecord {
  id: string;
  researchRunId: string;
  input: StudyAssessmentInput;
  finding: {
    direction: 'supporting' | 'neutral' | 'contradicting' | 'mixed' | 'not_estimable';
    effectEstimate: string;
    statisticalUncertainty: string;
    practicalSignificance: string;
    provenanceIds: string[];
  };
  readerBrief: SourceReadingBrief;
  trustProfile: import('./source-trust-score.ts').SourceTrustProfile;
  route: AppraisalRoute;
  gate: StudyGateResult;
  methodologyVersion: string;
  assessor: 'model_draft' | 'human';
  createdAt: string;
}

export interface SourceAssessmentResponse {
  status: 'model_draft' | 'needs_review' | 'awaiting_provider';
  reviewRequired: true;
  contentLevel: import('./source-document.ts').SourceContentLevel;
  assessment: SourceAssessmentRecord | null;
  warning: string;
}

export interface SourceAssessmentSummary {
  id: string;
  sourceId: string;
  resultId: string;
  questionType: import('./evidence-methodology.ts').EvidenceQuestionType;
  studyDesign: import('./evidence-methodology.ts').StudyDesign;
  decision: import('./evidence-methodology.ts').StudyGateDecision;
  reasons: import('./evidence-methodology.ts').StudyGateReason[];
  finding: SourceAssessmentRecord['finding'];
  methodologyVersion: string;
  createdAt: string;
  humanReview?: import('./evidence-review.ts').SourceAssessmentHumanReview;
}
