import assert from 'node:assert/strict';
import test from 'node:test';
import { validateContentBriefDraft } from './content-brief-contract.ts';
import { approvedClaim, validContentBrief } from './content-pipeline.fixture.ts';

test('accepts a brief that selects only supplied approved claims', () => {
  assert.deepEqual(validateContentBriefDraft(validContentBrief, new Set([approvedClaim.id])), validContentBrief);
});

test('rejects an invented claim id or persuasive extra field', () => {
  assert.throws(() => validateContentBriefDraft(
    { ...validContentBrief, selectedClaimVersionIds: ['invented'] }, new Set([approvedClaim.id]),
  ));
  assert.throws(() => validateContentBriefDraft(
    { ...validContentBrief, guaranteedResult: true }, new Set([approvedClaim.id]),
  ));
});
