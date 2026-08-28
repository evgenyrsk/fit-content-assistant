import assert from 'node:assert/strict';
import test from 'node:test';
import { approvedClaim, validPlatformDraft, validVoiceEdit } from './content-pipeline.fixture.ts';
import { validateVoiceEdit } from './voice-edit-contract.ts';

test('allows voice changes while preserving provenance and caveats', () => {
  assert.deepEqual(validateVoiceEdit(validVoiceEdit, validPlatformDraft, approvedClaim.limitations), validVoiceEdit);
});

test('rejects a voice edit that changes a claim link', () => {
  const changed = {
    ...validVoiceEdit,
    fragments: [{ ...validVoiceEdit.fragments[0], claimVersionIds: [] }, ...validVoiceEdit.fragments.slice(1)],
  };
  assert.throws(() => validateVoiceEdit(changed, validPlatformDraft, approvedClaim.limitations));
});
