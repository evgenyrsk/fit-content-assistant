import assert from 'node:assert/strict';
import test from 'node:test';
import { requiredStudyDimensions, type StudyAssessmentInput } from './evidence-methodology.ts';
import { calculateSourceTrustProfile } from './source-trust-score.ts';
import { requiredIntegrityChecks } from './study-integrity-policy.ts';

function input(judgement: StudyAssessmentInput['dimensions'][number]['judgement']): StudyAssessmentInput {
  return {
    sourceId: 's1', resultId: 'r1', questionType: 'intervention_effect',
    studyDesign: 'randomized_parallel', recordStatus: 'active', hasStableIdentifier: true,
    targetOutcomeMeasured: true, provenanceComplete: true, sponsorRole: 'fully_reported',
    dimensions: requiredStudyDimensions.map((dimension) => ({
      dimension, judgement, rationale: 'Checked.', provenanceIds: ['p1'], assessor: 'model_draft',
    })),
    integrityChecks: requiredIntegrityChecks('randomized_parallel').map((check) => ({
      check, state: judgement === 'unclear' ? 'unclear' : 'adequate', rationale: 'Checked.',
      provenanceIds: ['p1'], assessor: 'model_draft',
    })),
  };
}

test('an unreviewed source score is capped and never presented as certainty', () => {
  const profile = calculateSourceTrustProfile(input('low_concern'), {
    decision: 'needs_human_review', reasons: ['sponsor_role_unclear'], supportsClaim: false,
  });
  assert.equal(profile.score, 69);
  assert.ok(profile.caveats[0].includes('не вероятность'));
});

test('missing appraisal information widens the range and lowers coverage', () => {
  const complete = calculateSourceTrustProfile(input('low_concern'), {
    decision: 'eligible_for_synthesis', reasons: ['eligible_with_recorded_caveats'], supportsClaim: true,
  });
  const unclear = calculateSourceTrustProfile(input('unclear'), {
    decision: 'needs_human_review', reasons: ['incomplete_dimension_set'], supportsClaim: false,
  });
  assert.ok(unclear.coverage < complete.coverage);
  assert.ok((unclear.range.upper - unclear.range.lower) > (complete.range.upper - complete.range.lower));
});
