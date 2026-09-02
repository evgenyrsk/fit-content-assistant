import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveStudyDecision } from './evidence-review.ts';

test('a model-eligible assessment still needs explicit human confirmation', () => {
  assert.equal(effectiveStudyDecision('eligible_for_synthesis'), 'needs_human_review');
  assert.equal(effectiveStudyDecision('eligible_for_synthesis', 'confirmed'), 'eligible_for_synthesis');
});

test('human review cannot override deterministic exclusion or context-only status', () => {
  assert.equal(effectiveStudyDecision('excluded', 'confirmed'), 'excluded');
  assert.equal(effectiveStudyDecision('context_only', 'confirmed'), 'context_only');
});

test('rejection keeps an otherwise eligible assessment as context only', () => {
  assert.equal(effectiveStudyDecision('eligible_for_synthesis', 'rejected'), 'context_only');
});
