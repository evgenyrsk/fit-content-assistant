export type EvidenceQuestionType =
  | 'intervention_effect'
  | 'exposure_association'
  | 'prognosis'
  | 'diagnostic_accuracy'
  | 'systematic_review'
  | 'mechanistic_context';

export type StudyDesign =
  | 'randomized_parallel'
  | 'randomized_crossover'
  | 'cluster_randomized'
  | 'nonrandomized_intervention'
  | 'prospective_cohort'
  | 'retrospective_cohort'
  | 'case_control'
  | 'cross_sectional'
  | 'diagnostic_accuracy'
  | 'systematic_review_meta_analysis'
  | 'mechanistic_or_preclinical';

export type AppraisalInstrument =
  | 'rob2'
  | 'robins_i_2016'
  | 'robins_e'
  | 'quadas2'
  | 'amstar2'
  | 'expert_protocol_required';

export type ReportingGuideline =
  | 'consort_2025'
  | 'strobe'
  | 'stard_2015'
  | 'prisma_2020'
  | 'none';

export type StudyDimension =
  | 'question_fit'
  | 'internal_validity'
  | 'statistical_reliability'
  | 'reporting_integrity'
  | 'applicability'
  | 'conflicts_transparency'
  | 'record_integrity';

export type DimensionJudgement =
  | 'low_concern'
  | 'some_concerns'
  | 'high_concern'
  | 'critical'
  | 'unclear'
  | 'not_applicable';

export type EvidenceRecordStatus =
  | 'active'
  | 'corrected'
  | 'expression_of_concern'
  | 'retracted'
  | 'unknown';

export interface DimensionAssessment {
  dimension: StudyDimension;
  judgement: DimensionJudgement;
  rationale: string;
  provenanceIds: string[];
  assessor: 'model_draft' | 'human';
}

export interface StudyAssessmentInput {
  sourceId: string;
  resultId: string;
  questionType: EvidenceQuestionType;
  studyDesign: StudyDesign;
  recordStatus: EvidenceRecordStatus;
  hasStableIdentifier: boolean;
  targetOutcomeMeasured: boolean;
  provenanceComplete: boolean;
  sponsorRole: 'fully_reported' | 'partially_reported' | 'not_reported' | 'not_applicable';
  dimensions: DimensionAssessment[];
}

export type StudyGateDecision =
  | 'excluded'
  | 'context_only'
  | 'needs_human_review'
  | 'eligible_for_synthesis';

export type StudyGateReason =
  | 'retracted_record'
  | 'target_outcome_not_measured'
  | 'identity_or_version_unverified'
  | 'expression_of_concern'
  | 'incomplete_provenance'
  | 'incomplete_dimension_set'
  | 'critical_bias_concern'
  | 'high_bias_concern'
  | 'sponsor_role_unclear'
  | 'question_design_mismatch'
  | 'eligible_with_recorded_caveats';

export interface StudyGateResult {
  decision: StudyGateDecision;
  reasons: StudyGateReason[];
  supportsClaim: boolean;
}

export interface AppraisalRoute {
  instrument: AppraisalInstrument;
  reportingGuideline: ReportingGuideline;
  reportingGuidelineIsQualityScore: false;
  automatedDraftAllowed: boolean;
  notes: string[];
}

export const requiredStudyDimensions: readonly StudyDimension[] = [
  'question_fit',
  'internal_validity',
  'statistical_reliability',
  'reporting_integrity',
  'applicability',
  'conflicts_transparency',
  'record_integrity',
];
