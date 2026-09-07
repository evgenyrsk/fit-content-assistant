import assert from 'node:assert/strict';
import test from 'node:test';
import type { BodyAssessmentHumanReview } from '../../../../../lib/domain/index.ts';
import { bodyReviewResponse } from './route-contract.ts';

function review(decision: BodyAssessmentHumanReview['decision']): BodyAssessmentHumanReview {
  return {
    id: 'review-1', bodyAssessmentId: 'body-1', decision, evidenceSetChecked: true,
    contradictionsChecked: true, certaintyChecked: true, scopeChecked: true,
    reason: 'Проверено человеком.', reviewerId: 'owner', createdAt: '2026-09-07T00:00:00.000Z',
  };
}

test('confirmed body opens only draft preparation, never claim approval', () => {
  const response = bodyReviewResponse(review('confirmed'));
  assert.equal(response.claimDraftGateOpened, true);
  assert.equal(response.claimApprovalOpened, false);
});

test('rejected body leaves both claim gates closed', () => {
  const response = bodyReviewResponse(review('rejected'));
  assert.equal(response.claimDraftGateOpened, false);
  assert.equal(response.claimApprovalOpened, false);
});
