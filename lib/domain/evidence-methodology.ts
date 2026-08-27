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
  | 'quadas3'
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

export type StudyIntegrityCheckId =
  | 'prospective_registration'
  | 'prespecified_outcomes'
  | 'sample_size_justification'
  | 'randomization_process'
  | 'allocation_concealment'
  | 'blinding_or_objective_measurement'
  | 'missing_data_handling'
  | 'multiplicity_control'
  | 'confounding_control'
  | 'temporal_order'
  | 'comprehensive_search'
  | 'duplicate_assessment'
  | 'missing_results_assessment'
  | 'sponsor_analysis_independence'
  | 'data_code_availability';

export type IntegrityCheckState = 'adequate' | 'concern' | 'unclear' | 'not_applicable';

export interface StudyIntegrityCheck {
  check: StudyIntegrityCheckId;
  state: IntegrityCheckState;
  rationale: string;
  provenanceIds: string[];
  assessor: 'model_draft' | 'human';
}

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
  integrityChecks: StudyIntegrityCheck[];
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
  | 'design_checks_incomplete'
  | 'design_checks_unclear'
  | 'registration_or_protocol_concern'
  | 'selective_reporting_concern'
  | 'randomization_concern'
  | 'measurement_bias_concern'
  | 'attrition_concern'
  | 'multiplicity_concern'
  | 'confounding_or_temporality_concern'
  | 'imprecision_concern'
  | 'review_methods_concern'
  | 'sponsor_independence_concern'
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
