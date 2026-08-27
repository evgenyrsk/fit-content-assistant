import type { AppraisalRoute, EvidenceQuestionType, StudyDesign } from './evidence-methodology.ts';

const randomizedDesigns: StudyDesign[] = ['randomized_parallel', 'randomized_crossover', 'cluster_randomized'];
const observationalDesigns: StudyDesign[] = ['prospective_cohort', 'retrospective_cohort', 'case_control', 'cross_sectional'];

export function isQuestionDesignCompatible(question: EvidenceQuestionType, design: StudyDesign): boolean {
  if (question === 'intervention_effect') return randomizedDesigns.includes(design) || design === 'nonrandomized_intervention';
  if (question === 'exposure_association') return observationalDesigns.includes(design);
  if (question === 'prognosis') return design === 'prospective_cohort' || design === 'retrospective_cohort';
  if (question === 'diagnostic_accuracy') return design === 'diagnostic_accuracy';
  if (question === 'systematic_review') return design === 'systematic_review_meta_analysis';
  return design === 'mechanistic_or_preclinical';
}

export function routeAppraisal(question: EvidenceQuestionType, design: StudyDesign): AppraisalRoute {
  if (randomizedDesigns.includes(design)) {
    return { instrument: 'rob2', reportingGuideline: 'consort_2025', reportingGuidelineIsQualityScore: false, automatedDraftAllowed: true, notes: ['Assess a specific result, not the paper as a whole.'] };
  }
  if (design === 'nonrandomized_intervention') {
    return { instrument: 'robins_i_2016', reportingGuideline: 'strobe', reportingGuidelineIsQualityScore: false, automatedDraftAllowed: true, notes: ['ROBINS-I version 2 remains draft and is not the production default.'] };
  }
  if (question === 'exposure_association' && observationalDesigns.includes(design)) {
    return { instrument: 'robins_e', reportingGuideline: 'strobe', reportingGuidelineIsQualityScore: false, automatedDraftAllowed: false, notes: ['Human confirmation is required during methodology calibration.'] };
  }
  if (design === 'diagnostic_accuracy') {
    return { instrument: 'quadas2', reportingGuideline: 'stard_2015', reportingGuidelineIsQualityScore: false, automatedDraftAllowed: false, notes: ['Tool must be tailored to the review question before use.'] };
  }
  if (design === 'systematic_review_meta_analysis') {
    return { instrument: 'amstar2', reportingGuideline: 'prisma_2020', reportingGuidelineIsQualityScore: false, automatedDraftAllowed: true, notes: ['AMSTAR 2 critical domains are retained; no numeric total score is produced.'] };
  }
  return { instrument: 'expert_protocol_required', reportingGuideline: 'none', reportingGuidelineIsQualityScore: false, automatedDraftAllowed: false, notes: ['No calibrated production route exists for this question-design pair.'] };
}
