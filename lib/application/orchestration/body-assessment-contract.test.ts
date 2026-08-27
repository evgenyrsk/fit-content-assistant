import assert from 'node:assert/strict';
import test from 'node:test';
import { validateBodyAssessmentDraft } from './body-assessment-contract.ts';
import { validBodyAssessmentDraft } from './body-assessment.fixture.ts';

test('accepts a complete five-domain body assessment', () => {
  const draft = validBodyAssessmentDraft();
  assert.deepEqual(validateBodyAssessmentDraft(draft), draft);
});

test('rejects a body assessment without a required GRADE domain', () => {
  const draft = validBodyAssessmentDraft();
  assert.throws(() => validateBodyAssessmentDraft({ ...draft, domains: draft.domains.slice(1) }));
});

test('rejects an unexpected synthesized conclusion field', () => {
  assert.throws(() => validateBodyAssessmentDraft({ ...validBodyAssessmentDraft(), publicClaim: 'Creatine works.' }));
});
