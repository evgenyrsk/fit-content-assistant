import {
  requiredStudyDimensions,
  type DimensionJudgement,
  type EvidenceQuestionType,
  type IntegrityCheckState,
  type StudyDesign,
  type StudyDimension,
  type StudyIntegrityCheckId,
} from '../../domain/evidence-methodology.ts';
import { requiredIntegrityChecks } from '../../domain/study-integrity-policy.ts';
import type { SourceAssessmentRecord } from '../../domain/source-assessment.ts';

export interface SourceAssessmentDraft {
  resultId: string;
  questionType: EvidenceQuestionType;
  studyDesign: StudyDesign;
  targetOutcomeMeasured: boolean;
  sponsorRole: 'fully_reported' | 'partially_reported' | 'not_reported' | 'not_applicable';
  finding: SourceAssessmentRecord['finding'];
  dimensions: Array<{ dimension: StudyDimension; judgement: DimensionJudgement; rationale: string; provenanceIds: string[] }>;
  integrityChecks: Array<{ check: StudyIntegrityCheckId; state: IntegrityCheckState; rationale: string; provenanceIds: string[] }>;
}

const questionTypes: EvidenceQuestionType[] = [
  'intervention_effect', 'exposure_association', 'prognosis',
  'diagnostic_accuracy', 'systematic_review', 'mechanistic_context',
];
const studyDesigns: StudyDesign[] = [
  'randomized_parallel', 'randomized_crossover', 'cluster_randomized',
  'nonrandomized_intervention', 'prospective_cohort', 'retrospective_cohort',
  'case_control', 'cross_sectional', 'diagnostic_accuracy',
  'systematic_review_meta_analysis', 'mechanistic_or_preclinical',
];
const judgements: DimensionJudgement[] = [
  'low_concern', 'some_concerns', 'high_concern', 'critical', 'unclear', 'not_applicable',
];
const checkStates: IntegrityCheckState[] = ['adequate', 'concern', 'unclear', 'not_applicable'];
const checkIds: StudyIntegrityCheckId[] = [
  'prospective_registration', 'prespecified_outcomes', 'sample_size_justification',
  'randomization_process', 'allocation_concealment', 'blinding_or_objective_measurement',
  'missing_data_handling', 'multiplicity_control', 'confounding_control', 'temporal_order',
  'comprehensive_search', 'duplicate_assessment', 'missing_results_assessment',
  'sponsor_analysis_independence', 'data_code_availability',
];
const assessmentKeys = [
  'resultId', 'questionType', 'studyDesign', 'targetOutcomeMeasured',
  'sponsorRole', 'finding', 'dimensions', 'integrityChecks',
] as const;

const citedAssessment = (idKey: 'dimension' | 'check', values: readonly string[]) => ({
  type: 'object', additionalProperties: false,
  required: [idKey, idKey === 'dimension' ? 'judgement' : 'state', 'rationale', 'provenanceIds'],
  properties: {
    [idKey]: { type: 'string', enum: values },
    [idKey === 'dimension' ? 'judgement' : 'state']: {
      type: 'string', enum: idKey === 'dimension' ? judgements : checkStates,
    },
    rationale: { type: 'string', minLength: 3, maxLength: 700 },
    provenanceIds: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 1 } },
  },
});

export const sourceAssessmentSchema: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  required: ['resultId', 'questionType', 'studyDesign', 'targetOutcomeMeasured', 'sponsorRole', 'finding', 'dimensions', 'integrityChecks'],
  properties: {
    resultId: { type: 'string', minLength: 1, maxLength: 200 },
    questionType: { type: 'string', enum: questionTypes },
    studyDesign: { type: 'string', enum: studyDesigns },
    targetOutcomeMeasured: { type: 'boolean' },
    sponsorRole: { type: 'string', enum: ['fully_reported', 'partially_reported', 'not_reported', 'not_applicable'] },
    finding: {
      type: 'object', additionalProperties: false,
      required: ['direction', 'effectEstimate', 'statisticalUncertainty', 'practicalSignificance', 'provenanceIds'],
      properties: {
        direction: { type: 'string', enum: ['supporting', 'neutral', 'contradicting', 'mixed', 'not_estimable'] },
        effectEstimate: { type: 'string', minLength: 1, maxLength: 500 },
        statisticalUncertainty: { type: 'string', minLength: 1, maxLength: 500 },
        practicalSignificance: { type: 'string', minLength: 1, maxLength: 500 },
        provenanceIds: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 1 } },
      },
    },
    dimensions: { type: 'array', minItems: 7, maxItems: 7, items: citedAssessment('dimension', requiredStudyDimensions) },
    integrityChecks: { type: 'array', minItems: 1, maxItems: 12, items: citedAssessment('check', checkIds) },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function citedRowsAreValid(rows: unknown, ids: readonly string[], stateKey: string, states: readonly string[]): boolean {
  if (!Array.isArray(rows) || rows.length !== ids.length) return false;
  const present = new Set(rows.flatMap((row) => isRecord(row) && typeof row.dimension === 'string'
    ? [row.dimension] : isRecord(row) && typeof row.check === 'string' ? [row.check] : []));
  return ids.every((id) => present.has(id)) && rows.every((row) => isRecord(row)
    && Object.keys(row).length === 4
    && states.includes(String(row[stateKey])) && typeof row.rationale === 'string'
    && row.rationale.trim().length >= 3 && Array.isArray(row.provenanceIds)
    && row.provenanceIds.length > 0 && row.provenanceIds.every((id) => typeof id === 'string'));
}

function findingIsValid(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length !== 5) return false;
  return [
    ['supporting', 'neutral', 'contradicting', 'mixed', 'not_estimable'].includes(String(value.direction)),
    typeof value.effectEstimate === 'string' && value.effectEstimate.length > 0,
    typeof value.statisticalUncertainty === 'string' && value.statisticalUncertainty.length > 0,
    typeof value.practicalSignificance === 'string' && value.practicalSignificance.length > 0,
    Array.isArray(value.provenanceIds) && value.provenanceIds.length > 0
      && value.provenanceIds.every((id) => typeof id === 'string'),
  ].every(Boolean);
}

export function validateSourceAssessmentDraft(value: unknown): SourceAssessmentDraft {
  if (!isRecord(value)) throw new Error('Source assessment must be an object.');
  const design = value.studyDesign as StudyDesign;
  const requiredChecks = studyDesigns.includes(design) ? requiredIntegrityChecks(design) : [];
  const exactShape = Object.keys(value).length === assessmentKeys.length
    && Object.keys(value).every((key) => assessmentKeys.includes(key as typeof assessmentKeys[number]));
  const valid = [
    exactShape,
    typeof value.resultId === 'string',
    questionTypes.includes(value.questionType as EvidenceQuestionType),
    studyDesigns.includes(design),
    typeof value.targetOutcomeMeasured === 'boolean',
    ['fully_reported', 'partially_reported', 'not_reported', 'not_applicable'].includes(String(value.sponsorRole)),
    findingIsValid(value.finding),
    citedRowsAreValid(value.dimensions, requiredStudyDimensions, 'judgement', judgements),
    citedRowsAreValid(value.integrityChecks, requiredChecks, 'state', checkStates),
  ].every(Boolean);
  if (!valid) throw new Error('Source assessment failed the strict runtime contract.');
  return value as unknown as SourceAssessmentDraft;
}
