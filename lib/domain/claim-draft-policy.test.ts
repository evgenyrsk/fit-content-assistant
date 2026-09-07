import assert from 'node:assert/strict';
import test from 'node:test';
import type { BodyOfEvidenceAssessment, GradeDomain } from './body-certainty.ts';
import { evaluateClaimDraftPreparation } from './claim-draft-policy.ts';
import type { SourceAssessmentSummary } from './source-assessment.ts';

const domains: GradeDomain[] = [
  'risk_of_bias', 'inconsistency', 'indirectness', 'imprecision', 'publication_bias',
];

function body(overrides: Partial<BodyOfEvidenceAssessment> = {}): BodyOfEvidenceAssessment {
  return {
    outcomeId: 'outcome-1', questionId: 'question-1', eligibleStudyAssessmentIds: ['assessment-1'],
    contradictoryStudyAssessmentIds: [], initialCertainty: 'high', proposedCertainty: 'moderate',
    domains: domains.map((domain) => ({
      domain, concern: domain === 'publication_bias' ? 'unable_to_assess' : 'not_serious',
      rationale: domain === 'publication_bias' ? 'Слишком мало исследований.' : 'Проверено.',
      supportingAssessmentIds: ['assessment-1'], assessor: 'model_draft',
    })),
    rationale: 'Совокупность проверена.', humanReview: 'confirmed', methodologyVersion: '0.2.0-draft',
    ...overrides,
  };
}

function summary(overrides: Partial<SourceAssessmentSummary> = {}): SourceAssessmentSummary {
  return {
    id: 'assessment-1', sourceId: 'pmid:1', resultId: 'result-1',
    questionType: 'intervention_effect', studyDesign: 'randomized_parallel',
    decision: 'eligible_for_synthesis', reasons: ['eligible_with_recorded_caveats'],
    finding: {
      direction: 'supporting', effectEstimate: 'MD 1', statisticalUncertainty: '95% CI 0–2',
      practicalSignificance: 'Возможно значимо', provenanceIds: ['chunk-1'],
    },
    methodologyVersion: '0.2.0-draft', createdAt: '2026-09-07T00:00:00.000Z',
    humanReview: {
      id: 'review-1', assessmentId: 'assessment-1', decision: 'confirmed', findingChecked: true,
      provenanceChecked: true, scopeChecked: true, reason: 'Проверено человеком.',
      reviewerId: 'owner', createdAt: '2026-09-07T00:00:00.000Z',
    },
    ...overrides,
  };
}

test('publication bias uncertainty lowers certainty and requires a limitation without blocking a draft', () => {
  const gate = evaluateClaimDraftPreparation(body(), [summary()]);
  assert.equal(gate.decision, 'ready_for_draft');
  assert.deepEqual(gate.blockingReasons, []);
  assert.deepEqual(gate.certaintyReasons, ['publication_bias_unable_to_assess']);
  assert.equal(gate.confidenceCeiling, 'moderate');
  assert.match(gate.requiredLimitations[0], /Publication bias не удалось оценить/);
});

test('human confirmation, complete domains and rationale remain blocking requirements', () => {
  const incomplete = body({ domains: [], rationale: '', humanReview: 'pending' });
  const gate = evaluateClaimDraftPreparation(incomplete, [summary()]);
  assert.equal(gate.decision, 'blocked');
  assert.ok(gate.blockingReasons.includes('grade_domains_incomplete'));
  assert.ok(gate.blockingReasons.includes('rationale_missing'));
  assert.ok(gate.blockingReasons.includes('human_confirmation_required'));
});

test('unknown non-publication domains remain blocking rather than silently lowering certainty', () => {
  const assessment = body();
  assessment.domains[0] = { ...assessment.domains[0], concern: 'unable_to_assess' };
  const gate = evaluateClaimDraftPreparation(assessment, [summary()]);
  assert.ok(gate.blockingReasons.includes('non_publication_domain_unable_to_assess'));
});

test('hard stops, missing source confirmation and missing provenance remain closed', () => {
  const unsafe = summary({
    decision: 'excluded', reasons: ['retracted_record'],
    finding: { ...summary().finding, provenanceIds: [] }, humanReview: undefined,
  });
  const gate = evaluateClaimDraftPreparation(body(), [unsafe]);
  assert.equal(gate.decision, 'blocked');
  assert.ok(gate.blockingReasons.includes('source_hard_stop'));
  assert.ok(gate.blockingReasons.includes('source_confirmation_required'));
  assert.ok(gate.blockingReasons.includes('source_provenance_missing'));
});
