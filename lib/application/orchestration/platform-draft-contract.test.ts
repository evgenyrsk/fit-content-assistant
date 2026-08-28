import assert from 'node:assert/strict';
import test from 'node:test';
import { approvedClaim, validPlatformDraft } from './content-pipeline.fixture.ts';
import { validatePlatformDraft } from './platform-draft-contract.ts';

test('accepts traceable factual fragments with every required caveat', () => {
  assert.deepEqual(validatePlatformDraft(
    validPlatformDraft, new Set([approvedClaim.id]), approvedClaim.limitations,
  ), validPlatformDraft);
});

test('rejects a fact without a claim link and a lost caveat', () => {
  const unsupported = {
    ...validPlatformDraft,
    fragments: [{ ...validPlatformDraft.fragments[0], claimVersionIds: [] }],
  };
  assert.throws(() => validatePlatformDraft(unsupported, new Set([approvedClaim.id]), approvedClaim.limitations));
  assert.throws(() => validatePlatformDraft(
    { ...validPlatformDraft, coveredCaveats: [] }, new Set([approvedClaim.id]), approvedClaim.limitations,
  ));
});
