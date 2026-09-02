import assert from 'node:assert/strict';
import test from 'node:test';
import { canPrepareClaimDraft, evaluateBodyGate, type BodyOfEvidenceAssessment, type GradeDomain } from './body-certainty.ts';

const domains: GradeDomain[] = ['risk_of_bias', 'inconsistency', 'indirectness', 'imprecision', 'publication_bias'];

function makeBody(overrides: Partial<BodyOfEvidenceAssessment> = {}): BodyOfEvidenceAssessment {
  return {
    outcomeId: 'outcome-1',
    questionId: 'question-1',
    eligibleStudyAssessmentIds: ['assessment-1'],
    contradictoryStudyAssessmentIds: [],
    domains: domains.map((domain) => ({ domain, concern: 'not_serious', rationale: 'Fixture rationale.', supportingAssessmentIds: ['assessment-1'], assessor: 'human' })),
    initialCertainty: 'high',
    proposedCertainty: 'high',
    rationale: 'All required domains were considered.',
    humanReview: 'confirmed',
    methodologyVersion: '0.2.0-draft',
    ...overrides,
  };
}

test('an uncalibrated methodology always requires human review', () => {
  const gate = evaluateBodyGate(makeBody(), false);
  assert.equal(gate.decision, 'needs_human_review');
  assert.ok(gate.reasons.includes('methodology_not_calibrated'));
});

test('missing GRADE domains fail closed', () => {
  const gate = evaluateBodyGate(makeBody({ domains: [] }), true);
  assert.ok(gate.reasons.includes('grade_domains_incomplete'));
});

test('a complete calibrated and confirmed body can proceed to claim review', () => {
  assert.deepEqual(evaluateBodyGate(makeBody(), true), {
    decision: 'ready_for_claim_review', reasons: ['body_ready_for_claim_review'],
  });
});

test('a confirmed complete body may produce a review draft before methodology calibration', () => {
  assert.equal(canPrepareClaimDraft(makeBody()), true);
  assert.equal(canPrepareClaimDraft(makeBody({ humanReview: 'pending' })), false);
});
