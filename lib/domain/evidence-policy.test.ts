import assert from 'node:assert/strict';
import test from 'node:test';
import { canAutomaticallyApproveClaim, evaluateStudyGate } from './evidence-policy.ts';
import { requiredStudyDimensions, type StudyAssessmentInput } from './evidence-methodology.ts';
import { routeAppraisal } from './evidence-routing.ts';

function makeInput(overrides: Partial<StudyAssessmentInput> = {}): StudyAssessmentInput {
  return {
    sourceId: 'source-1',
    resultId: 'result-1',
    questionType: 'intervention_effect',
    studyDesign: 'randomized_parallel',
    recordStatus: 'active',
    hasStableIdentifier: true,
    targetOutcomeMeasured: true,
    provenanceComplete: true,
    sponsorRole: 'fully_reported',
    dimensions: requiredStudyDimensions.map((dimension) => ({
      dimension,
      judgement: 'low_concern',
      rationale: 'Fixture rationale with exact provenance.',
      provenanceIds: [`passage-${dimension}`],
      assessor: 'human',
    })),
    ...overrides,
  };
}

test('retracted records are excluded deterministically', () => {
  assert.deepEqual(evaluateStudyGate(makeInput({ recordStatus: 'retracted' })), {
    decision: 'excluded', reasons: ['retracted_record'], supportsClaim: false,
  });
});

test('a result that did not measure the target outcome cannot support the claim', () => {
  assert.equal(evaluateStudyGate(makeInput({ targetOutcomeMeasured: false })).decision, 'excluded');
});

test('missing provenance fails closed to human review', () => {
  assert.deepEqual(evaluateStudyGate(makeInput({ provenanceComplete: false })).reasons, ['incomplete_provenance']);
});

test('critical bias keeps a study as context only', () => {
  const input = makeInput();
  input.dimensions[1] = { ...input.dimensions[1], judgement: 'critical' };
  assert.equal(evaluateStudyGate(input).decision, 'context_only');
});

test('unreported sponsor role triggers review but does not declare the study false', () => {
  const gate = evaluateStudyGate(makeInput({ sponsorRole: 'not_reported' }));
  assert.equal(gate.decision, 'needs_human_review');
  assert.deepEqual(gate.reasons, ['sponsor_role_unclear']);
});

test('complete low-concern assessment is eligible for body synthesis', () => {
  assert.equal(evaluateStudyGate(makeInput()).decision, 'eligible_for_synthesis');
});

test('reporting guidance is never treated as a quality score', () => {
  const route = routeAppraisal('systematic_review', 'systematic_review_meta_analysis');
  assert.equal(route.instrument, 'amstar2');
  assert.equal(route.reportingGuideline, 'prisma_2020');
  assert.equal(route.reportingGuidelineIsQualityScore, false);
});

test('automatic claim approval remains disabled before calibration', () => {
  assert.equal(canAutomaticallyApproveClaim(), false);
});
