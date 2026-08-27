export type BodyCertainty = 'high' | 'moderate' | 'low' | 'very_low' | 'insufficient';

export type GradeDomain =
  | 'risk_of_bias'
  | 'inconsistency'
  | 'indirectness'
  | 'imprecision'
  | 'publication_bias';

export type GradeConcern = 'not_serious' | 'serious' | 'very_serious' | 'unable_to_assess';

export interface GradeDomainAssessment {
  domain: GradeDomain;
  concern: GradeConcern;
  rationale: string;
  supportingAssessmentIds: string[];
  assessor: 'model_draft' | 'human';
}

export interface BodyOfEvidenceAssessment {
  outcomeId: string;
  questionId: string;
  eligibleStudyAssessmentIds: string[];
  contradictoryStudyAssessmentIds: string[];
  domains: GradeDomainAssessment[];
  initialCertainty: BodyCertainty;
  proposedCertainty: BodyCertainty;
  rationale: string;
  humanReview: 'pending' | 'confirmed' | 'rejected';
  methodologyVersion: string;
}

export type BodyGateReason =
  | 'no_eligible_studies'
  | 'grade_domains_incomplete'
  | 'domain_unable_to_assess'
  | 'rationale_missing'
  | 'human_confirmation_required'
  | 'methodology_not_calibrated'
  | 'body_ready_for_claim_review';

export interface BodyGateResult {
  decision: 'needs_human_review' | 'ready_for_claim_review';
  reasons: BodyGateReason[];
}

const requiredGradeDomains: readonly GradeDomain[] = [
  'risk_of_bias',
  'inconsistency',
  'indirectness',
  'imprecision',
  'publication_bias',
];

export function evaluateBodyGate(input: BodyOfEvidenceAssessment, methodologyCalibrated: boolean): BodyGateResult {
  const reasons: BodyGateReason[] = [];
  const present = new Set(input.domains.map((item) => item.domain));
  if (input.eligibleStudyAssessmentIds.length === 0) reasons.push('no_eligible_studies');
  if (!requiredGradeDomains.every((domain) => present.has(domain))) reasons.push('grade_domains_incomplete');
  if (input.domains.some((item) => item.concern === 'unable_to_assess')) reasons.push('domain_unable_to_assess');
  if (!input.rationale.trim()) reasons.push('rationale_missing');
  if (input.humanReview !== 'confirmed') reasons.push('human_confirmation_required');
  if (!methodologyCalibrated) reasons.push('methodology_not_calibrated');
  return reasons.length > 0
    ? { decision: 'needs_human_review', reasons }
    : { decision: 'ready_for_claim_review', reasons: ['body_ready_for_claim_review'] };
}
