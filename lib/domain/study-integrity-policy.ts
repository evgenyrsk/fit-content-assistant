import type {
  StudyDesign,
  StudyGateReason,
  StudyIntegrityCheck,
  StudyIntegrityCheckId,
} from './evidence-methodology.ts';

const randomizedChecks: readonly StudyIntegrityCheckId[] = [
  'prospective_registration', 'prespecified_outcomes', 'sample_size_justification',
  'randomization_process', 'allocation_concealment', 'blinding_or_objective_measurement',
  'missing_data_handling', 'multiplicity_control', 'sponsor_analysis_independence',
];

const observationalChecks: readonly StudyIntegrityCheckId[] = [
  'prospective_registration', 'prespecified_outcomes', 'sample_size_justification',
  'confounding_control', 'temporal_order', 'missing_data_handling',
  'multiplicity_control', 'sponsor_analysis_independence',
];

const reviewChecks: readonly StudyIntegrityCheckId[] = [
  'prospective_registration', 'prespecified_outcomes', 'comprehensive_search',
  'duplicate_assessment', 'missing_results_assessment', 'sponsor_analysis_independence',
];

const diagnosticChecks: readonly StudyIntegrityCheckId[] = [
  'prospective_registration', 'prespecified_outcomes', 'sample_size_justification',
  'blinding_or_objective_measurement', 'missing_data_handling', 'multiplicity_control',
  'sponsor_analysis_independence',
];

const mechanisticChecks: readonly StudyIntegrityCheckId[] = [
  'prespecified_outcomes', 'sample_size_justification',
  'blinding_or_objective_measurement', 'multiplicity_control',
  'sponsor_analysis_independence', 'data_code_availability',
];

export function requiredIntegrityChecks(design: StudyDesign): readonly StudyIntegrityCheckId[] {
  if (design.startsWith('randomized_') || design === 'cluster_randomized') return randomizedChecks;
  if (design === 'systematic_review_meta_analysis') return reviewChecks;
  if (design === 'diagnostic_accuracy') return diagnosticChecks;
  if (design === 'mechanistic_or_preclinical') return mechanisticChecks;
  return observationalChecks;
}

const concernReasons: Record<StudyIntegrityCheckId, StudyGateReason> = {
  prospective_registration: 'registration_or_protocol_concern',
  prespecified_outcomes: 'selective_reporting_concern',
  sample_size_justification: 'imprecision_concern',
  randomization_process: 'randomization_concern',
  allocation_concealment: 'randomization_concern',
  blinding_or_objective_measurement: 'measurement_bias_concern',
  missing_data_handling: 'attrition_concern',
  multiplicity_control: 'multiplicity_concern',
  confounding_control: 'confounding_or_temporality_concern',
  temporal_order: 'confounding_or_temporality_concern',
  comprehensive_search: 'review_methods_concern',
  duplicate_assessment: 'review_methods_concern',
  missing_results_assessment: 'review_methods_concern',
  sponsor_analysis_independence: 'sponsor_independence_concern',
  data_code_availability: 'review_methods_concern',
};

export function integrityGateReasons(design: StudyDesign, checks: StudyIntegrityCheck[]): StudyGateReason[] {
  const required = requiredIntegrityChecks(design);
  const byId = new Map(checks.map((item) => [item.check, item]));
  if (required.some((check) => !byId.has(check))) return ['design_checks_incomplete'];
  if (required.some((check) => ['unclear', 'not_applicable'].includes(byId.get(check)?.state ?? 'unclear'))) {
    return ['design_checks_unclear'];
  }
  const concerns = required
    .filter((check) => byId.get(check)?.state === 'concern')
    .map((check) => concernReasons[check]);
  return [...new Set(concerns)];
}
