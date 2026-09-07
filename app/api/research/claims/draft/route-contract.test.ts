import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClaimDraftPreparationGate } from '../../../../../lib/domain/index.ts';
import { claimDraftFailureWarning, emptyClaimSynthesisResponse } from './route-contract.ts';

function gate(overrides: Partial<ClaimDraftPreparationGate> = {}): ClaimDraftPreparationGate {
  return {
    decision: 'blocked', blockingReasons: ['human_confirmation_required'], certaintyReasons: [],
    confidenceCeiling: 'moderate', requiredLimitations: [], ...overrides,
  };
}

test('API contract keeps a blocked claim empty and human-gated', () => {
  const policy = gate();
  const response = emptyClaimSynthesisResponse('needs_review', claimDraftFailureWarning(policy), policy);
  assert.equal(response.reviewRequired, true);
  assert.equal(response.claim, null);
  assert.match(response.warning, /человеческого подтверждения body assessment/);
});

test('a ready policy reports contract failure instead of falsely asking for body review', () => {
  const policy = gate({ decision: 'ready_for_draft', blockingReasons: [] });
  assert.match(claimDraftFailureWarning(policy), /строгий контракт|evidence links/);
  assert.doesNotMatch(claimDraftFailureWarning(policy), /подтверждения body/);
});
