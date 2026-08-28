import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateBodyGate, type BodyOfEvidenceAssessment } from './body-certainty.ts';
import { evaluateStudyGate } from './evidence-policy.ts';
import { requiredStudyDimensions, type StudyAssessmentInput } from './evidence-methodology.ts';
import { requiredIntegrityChecks } from './study-integrity-policy.ts';

function study(overrides: Partial<StudyAssessmentInput> = {}): StudyAssessmentInput {
  return {
    sourceId: 'source-regression', resultId: 'result-regression', questionType: 'intervention_effect',
    studyDesign: 'randomized_parallel', recordStatus: 'active', hasStableIdentifier: true,
    targetOutcomeMeasured: true, provenanceComplete: true, sponsorRole: 'fully_reported',
    dimensions: requiredStudyDimensions.map((dimension) => ({
      dimension, judgement: 'low_concern', rationale: 'Human fixture rationale.',
      provenanceIds: [`passage:${dimension}`], assessor: 'human',
    })),
    integrityChecks: requiredIntegrityChecks('randomized_parallel').map((check) => ({
      check, state: 'adequate', rationale: 'Human fixture check.', provenanceIds: [`passage:${check}`], assessor: 'human',
    })),
    ...overrides,
  };
}

function contradictoryBody(): BodyOfEvidenceAssessment {
  return {
    outcomeId: 'strength', questionId: 'q-regression', eligibleStudyAssessmentIds: ['study-a'],
    contradictoryStudyAssessmentIds: ['study-b'], initialCertainty: 'high', proposedCertainty: 'moderate',
    domains: [
      { domain: 'risk_of_bias', concern: 'not_serious', rationale: 'Low concern.', supportingAssessmentIds: ['study-a'], assessor: 'human' },
      { domain: 'inconsistency', concern: 'serious', rationale: 'Directions conflict.', supportingAssessmentIds: ['study-a', 'study-b'], assessor: 'human' },
      { domain: 'indirectness', concern: 'not_serious', rationale: 'Direct.', supportingAssessmentIds: ['study-a'], assessor: 'human' },
      { domain: 'imprecision', concern: 'not_serious', rationale: 'Precise.', supportingAssessmentIds: ['study-a'], assessor: 'human' },
      { domain: 'publication_bias', concern: 'unable_to_assess', rationale: 'Too few studies.', supportingAssessmentIds: ['study-a'], assessor: 'human' },
    ],
    rationale: 'Contradictory corpus remains visible.', humanReview: 'pending', methodologyVersion: '0.2.0-draft',
  };
}

test('blocking regression set preserves strong, borderline, contradictory and retracted outcomes', () => {
  const borderline = study({ sponsorRole: 'partially_reported' });
  const strong = study();
  const retracted = study({ recordStatus: 'retracted' });
  assert.equal(evaluateStudyGate(strong).decision, 'eligible_for_synthesis');
  assert.equal(evaluateStudyGate(borderline).decision, 'needs_human_review');
  assert.equal(evaluateStudyGate(retracted).decision, 'excluded');
  const contradictionGate = evaluateBodyGate(contradictoryBody(), false);
  assert.equal(contradictionGate.decision, 'needs_human_review');
  assert.ok(contradictionGate.reasons.includes('domain_unable_to_assess'));
  assert.ok(contradictionGate.reasons.includes('methodology_not_calibrated'));
});
