import assert from 'node:assert/strict';
import test from 'node:test';
import { approvedClaim, validFactReview, validVoiceEdit } from './content-pipeline.fixture.ts';
import { validateFactReview } from './fact-review-contract.ts';

test('accepts complete zero-unsupported fragment review', () => {
  assert.deepEqual(validateFactReview(validFactReview, validVoiceEdit, approvedClaim.limitations), validFactReview);
});

test('blocks approval when any fragment is unsupported', () => {
  assert.throws(() => validateFactReview({
    ...validFactReview, unsupportedFragmentIds: ['fragment-1'],
  }, validVoiceEdit, approvedClaim.limitations));
});
