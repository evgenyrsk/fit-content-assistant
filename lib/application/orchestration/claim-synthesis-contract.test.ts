import assert from 'node:assert/strict';
import test from 'node:test';
import { validateClaimSynthesisDraft } from './claim-synthesis-contract.ts';
import { validClaimSynthesisDraft } from './claim-synthesis.fixture.ts';

test('accepts an atomic scoped claim with exact evidence links', () => {
  const draft = validClaimSynthesisDraft();
  assert.deepEqual(validateClaimSynthesisDraft(draft), draft);
});

test('rejects a claim without limitations or evidence', () => {
  const draft = validClaimSynthesisDraft();
  assert.throws(() => validateClaimSynthesisDraft({ ...draft, limitations: [] }));
  assert.throws(() => validateClaimSynthesisDraft({ ...draft, evidence: [] }));
});

test('rejects extra persuasive copy outside the claim contract', () => {
  assert.throws(() => validateClaimSynthesisDraft({ ...validClaimSynthesisDraft(), hook: 'You have been lied to.' }));
});
