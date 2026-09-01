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

test('accepts a rejected review that honestly reports a missing caveat', () => {
  const review = {
    ...validFactReview,
    decision: 'rejected' as const,
    preservedCaveats: [],
    unsupportedFragmentIds: ['fragment-3'],
    fragmentReviews: validFactReview.fragmentReviews.map((item) => item.fragmentId === 'fragment-3'
      ? { ...item, decision: 'rejected' as const, reasons: ['Required caveat is absent from the draft.'] }
      : item),
  };
  assert.deepEqual(validateFactReview(review, validVoiceEdit, approvedClaim.limitations), review);
});

test('does not approve a review with a missing required caveat', () => {
  assert.throws(() => validateFactReview({
    ...validFactReview, preservedCaveats: [],
  }, validVoiceEdit, approvedClaim.limitations));
});

test('rejects inconsistent fragment decisions and unsupported ids', () => {
  assert.throws(() => validateFactReview({
    ...validFactReview,
    decision: 'rejected',
    unsupportedFragmentIds: ['fragment-1'],
  }, validVoiceEdit, approvedClaim.limitations));
});
