import assert from 'node:assert/strict';
import test from 'node:test';
import { canAutomaticallyApproveClaim, evaluateStudyGate } from './evidence-policy.ts';
import { requiredStudyDimensions, type StudyAssessmentInput } from './evidence-methodology.ts';
import { routeAppraisal } from './evidence-routing.ts';
import { requiredIntegrityChecks } from './study-integrity-policy.ts';

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
    integrityChecks: requiredIntegrityChecks('randomized_parallel').map((check) => ({
      check,
      state: 'adequate',
      rationale: 'Fixture assessment with exact provenance.',
      provenanceIds: [`passage-${check}`],
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

test('missing design-specific checks fail closed', () => {
  const gate = evaluateStudyGate(makeInput({ integrityChecks: [] }));
  assert.deepEqual(gate.reasons, ['design_checks_incomplete']);
});

test('selective reporting concern requires human review', () => {
  const input = makeInput();
  input.integrityChecks = input.integrityChecks.map((item) => (
    item.check === 'prespecified_outcomes' ? { ...item, state: 'concern' } : item
  ));
  const gate = evaluateStudyGate(input);
  assert.equal(gate.decision, 'needs_human_review');
  assert.deepEqual(gate.reasons, ['selective_reporting_concern']);
});

test('observational evidence requires confounding and temporality checks', () => {
  const required = requiredIntegrityChecks('prospective_cohort');
  assert.ok(required.includes('confounding_control'));
  assert.ok(required.includes('temporal_order'));
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

test('diagnostic accuracy uses the current QUADAS generation', () => {
  assert.equal(routeAppraisal('diagnostic_accuracy', 'diagnostic_accuracy').instrument, 'quadas3');
});

test('automatic claim approval remains disabled before calibration', () => {
  assert.equal(canAutomaticallyApproveClaim(), false);
});
