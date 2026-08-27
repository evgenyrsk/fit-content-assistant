import { isQuestionDesignCompatible } from './evidence-routing.ts';
import { requiredStudyDimensions, type StudyAssessmentInput, type StudyGateReason, type StudyGateResult } from './evidence-methodology.ts';

export const methodologyRelease = {
  version: '0.1.0-draft',
  calibrated: false,
  automatedClaimApprovalEnabled: false,
} as const;

function result(decision: StudyGateResult['decision'], reasons: StudyGateReason[]): StudyGateResult {
  return { decision, reasons, supportsClaim: decision === 'eligible_for_synthesis' };
}

function hasCompleteDimensions(input: StudyAssessmentInput): boolean {
  const present = new Set(input.dimensions.map((item) => item.dimension));
  return requiredStudyDimensions.every((dimension) => present.has(dimension));
}

function evaluateExclusion(input: StudyAssessmentInput): StudyGateResult | null {
  if (input.recordStatus === 'retracted') return result('excluded', ['retracted_record']);
  if (!input.targetOutcomeMeasured) return result('excluded', ['target_outcome_not_measured']);
  return null;
}

function collectCompletenessReasons(input: StudyAssessmentInput): StudyGateReason[] {
  const reviewReasons: StudyGateReason[] = [];
  if (!input.hasStableIdentifier || input.recordStatus === 'unknown') reviewReasons.push('identity_or_version_unverified');
  if (input.recordStatus === 'expression_of_concern') reviewReasons.push('expression_of_concern');
  if (!input.provenanceComplete) reviewReasons.push('incomplete_provenance');
  if (!hasCompleteDimensions(input) || input.dimensions.some((item) => item.judgement === 'unclear')) reviewReasons.push('incomplete_dimension_set');
  return reviewReasons;
}

function collectEscalationReasons(input: StudyAssessmentInput): StudyGateReason[] {
  const reviewReasons: StudyGateReason[] = [];
  if (input.dimensions.some((item) => item.judgement === 'high_concern')) reviewReasons.push('high_bias_concern');
  if (input.sponsorRole === 'not_reported' || input.sponsorRole === 'partially_reported') reviewReasons.push('sponsor_role_unclear');
  return reviewReasons;
}

export function evaluateStudyGate(input: StudyAssessmentInput): StudyGateResult {
  const exclusion = evaluateExclusion(input);
  if (exclusion) return exclusion;
  if (!isQuestionDesignCompatible(input.questionType, input.studyDesign)) return result('needs_human_review', ['question_design_mismatch']);
  const completenessReasons = collectCompletenessReasons(input);
  if (completenessReasons.length > 0) return result('needs_human_review', completenessReasons);
  if (input.dimensions.some((item) => item.judgement === 'critical')) return result('context_only', ['critical_bias_concern']);
  const escalationReasons = collectEscalationReasons(input);
  if (escalationReasons.length > 0) return result('needs_human_review', escalationReasons);

  return result('eligible_for_synthesis', ['eligible_with_recorded_caveats']);
}

export function canAutomaticallyApproveClaim(): boolean {
  return methodologyRelease.calibrated && methodologyRelease.automatedClaimApprovalEnabled;
}
