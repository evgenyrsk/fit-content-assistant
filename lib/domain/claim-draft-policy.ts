import type { BodyOfEvidenceAssessment, BodyCertainty } from './body-certainty.ts';
import type { Confidence } from './evidence.ts';
import type { StudyGateReason } from './evidence-methodology.ts';
import type { SourceAssessmentSummary } from './source-assessment.ts';

export type ClaimDraftBlockingReason =
  | 'no_eligible_studies'
  | 'grade_domains_incomplete'
  | 'non_publication_domain_unable_to_assess'
  | 'rationale_missing'
  | 'human_confirmation_required'
  | 'source_hard_stop'
  | 'source_confirmation_required'
  | 'source_provenance_missing';

export type ClaimDraftCertaintyReason = 'publication_bias_unable_to_assess';

export interface ClaimDraftPreparationGate {
  decision: 'blocked' | 'ready_for_draft';
  blockingReasons: ClaimDraftBlockingReason[];
  certaintyReasons: ClaimDraftCertaintyReason[];
  confidenceCeiling: Confidence;
  requiredLimitations: string[];
}

const requiredDomains = [
  'risk_of_bias', 'inconsistency', 'indirectness', 'imprecision', 'publication_bias',
] as const;

const hardStopReasons = new Set<StudyGateReason>([
  'retracted_record', 'target_outcome_not_measured', 'critical_bias_concern',
]);

const confidenceRank: Record<Confidence, number> = {
  insufficient: 0, low: 1, moderate: 2, high: 3,
};

function claimConfidence(certainty: BodyCertainty): Confidence {
  if (certainty === 'very_low') return 'low';
  return certainty;
}

function lowerConfidence(confidence: Confidence): Confidence {
  const next = Math.max(0, confidenceRank[confidence] - 1);
  return (Object.keys(confidenceRank) as Confidence[])
    .find((item) => confidenceRank[item] === next) ?? 'insufficient';
}

function unique<T extends string>(items: T[]): T[] {
  return [...new Set(items)];
}

function bodyBlockingReasons(body: BodyOfEvidenceAssessment): ClaimDraftBlockingReason[] {
  const reasons: ClaimDraftBlockingReason[] = [];
  const present = new Set(body.domains.map((item) => item.domain));
  if (body.eligibleStudyAssessmentIds.length === 0) reasons.push('no_eligible_studies');
  if (body.domains.length !== requiredDomains.length
    || !requiredDomains.every((domain) => present.has(domain))) reasons.push('grade_domains_incomplete');
  if (body.domains.some((item) => item.domain !== 'publication_bias'
    && item.concern === 'unable_to_assess')) reasons.push('non_publication_domain_unable_to_assess');
  if (!body.rationale.trim()) reasons.push('rationale_missing');
  if (body.humanReview !== 'confirmed') reasons.push('human_confirmation_required');
  return reasons;
}

function sourceReasons(summary?: SourceAssessmentSummary): ClaimDraftBlockingReason[] {
  const reasons: ClaimDraftBlockingReason[] = [];
  if (!summary) return ['source_confirmation_required', 'source_provenance_missing'];
  if (summary.decision !== 'eligible_for_synthesis'
    || summary.humanReview?.decision !== 'confirmed') reasons.push('source_confirmation_required');
  if (summary.reasons.some((reason) => hardStopReasons.has(reason))) reasons.push('source_hard_stop');
  if (summary.finding.provenanceIds.length === 0
    || summary.finding.provenanceIds.some((id) => !id.trim())) reasons.push('source_provenance_missing');
  return reasons;
}

function sourceBlockingReasons(
  body: BodyOfEvidenceAssessment,
  summaries: SourceAssessmentSummary[],
): ClaimDraftBlockingReason[] {
  const byId = new Map(summaries.map((summary) => [summary.id, summary]));
  return unique(body.eligibleStudyAssessmentIds.flatMap((id) => sourceReasons(byId.get(id))));
}

function publicationBias(body: BodyOfEvidenceAssessment) {
  return body.domains.find((item) => item.domain === 'publication_bias'
    && item.concern === 'unable_to_assess');
}

function publicationBiasLimitation(rationale: string): string {
  const prefix = 'Publication bias не удалось оценить: ';
  return `${prefix}${rationale.trim().slice(0, 500 - prefix.length)}`;
}

export function evaluateClaimDraftPreparation(
  body: BodyOfEvidenceAssessment,
  summaries: SourceAssessmentSummary[],
): ClaimDraftPreparationGate {
  const bias = publicationBias(body);
  const blockingReasons = unique([...bodyBlockingReasons(body), ...sourceBlockingReasons(body, summaries)]);
  const proposed = claimConfidence(body.proposedCertainty);
  const confidenceCeiling = bias
    ? (confidenceRank[lowerConfidence(claimConfidence(body.initialCertainty))] < confidenceRank[proposed]
      ? lowerConfidence(claimConfidence(body.initialCertainty)) : proposed)
    : proposed;
  return {
    decision: blockingReasons.length > 0 ? 'blocked' : 'ready_for_draft',
    blockingReasons,
    certaintyReasons: bias ? ['publication_bias_unable_to_assess'] : [],
    confidenceCeiling,
    requiredLimitations: bias
      ? [publicationBiasLimitation(bias.rationale)]
      : [],
  };
}

export function clampClaimConfidence(confidence: Confidence, ceiling: Confidence): Confidence {
  return confidenceRank[confidence] <= confidenceRank[ceiling] ? confidence : ceiling;
}
