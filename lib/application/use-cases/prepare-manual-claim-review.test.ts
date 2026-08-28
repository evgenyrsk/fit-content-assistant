import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareManualClaimReview } from './prepare-manual-claim-review.ts';
import type { ManualClaimReviewContext } from '../../domain/index.ts';

const context: ManualClaimReviewContext = {
  claim: {
    id: 'v1', claimId: 'c1', version: 1, statement: 'Проверяемый тезис о результате.', topic: 'Тема',
    scope: { population: 'взрослые' }, confidence: 'moderate', limitations: ['Ограничение'],
    status: 'needs_review', evidenceCount: 2, sourceTypes: ['RCT'],
    reviewDueAt: '2027-08-28T00:00:00.000Z', createdAt: '2026-08-28T00:00:00.000Z',
  },
  evidence: [
    { sourceChunkId: 'm1', sourceId: 's1', sourceTitle: 'Study', sourceType: 'RCT', kind: 'methods', locator: 'Methods', excerpt: 'Methods', direction: 'neutral', weight: 'context', eligibleForApproval: true },
    { sourceChunkId: 'r1', sourceId: 's1', sourceTitle: 'Study', sourceType: 'RCT', kind: 'results', locator: 'Results', excerpt: 'Results', direction: 'supporting', weight: 'primary', eligibleForApproval: true },
  ],
};

function approval() {
  return {
    decision: 'approved', reason: 'Формулировка соответствует выбранным фрагментам полного текста.',
    contradictoryEvidenceNote: 'Противоречащие данные проверены; в выбранном корпусе не обнаружены.',
    provenanceChecked: true, scopeChecked: true, contradictionsChecked: true,
  };
}

test('allows explicit human approval after every gate is confirmed', () => {
  const review = prepareManualClaimReview(approval(), context, {
    now: () => new Date('2026-08-29T00:00:00.000Z'), createId: () => 'review-1',
  });
  assert.equal(review.decision, 'approved');
  assert.equal(review.reviewerId, 'owner');
});

test('blocks approval when the scope confirmation is missing', () => {
  assert.throws(() => prepareManualClaimReview({ ...approval(), scopeChecked: false }, context));
});

test('blocks approval when a linked source is no longer eligible', () => {
  const stale = { ...context, evidence: context.evidence.map((item, index) => ({
    ...item, eligibleForApproval: index !== 0,
  })) };
  assert.throws(() => prepareManualClaimReview(approval(), stale));
});
