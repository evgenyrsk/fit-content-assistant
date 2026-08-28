import assert from 'node:assert/strict';
import test from 'node:test';
import { submitSourceReview } from './submit-source-review.ts';

test('records a human source review and matching audit event', async () => {
  const audit: unknown[] = [];
  const review = await submitSourceReview({
    sourceId: 'pmid:1', decision: 'excluded',
    reason: 'Population does not match the research question.', reviewerId: 'owner',
  }, {
    now: () => new Date('2026-08-28T12:00:00.000Z'),
    decisions: { save: async (submission, createdAt) => ({
      id: 'review-1', ...submission, createdAt, overridesIntake: true,
    }) },
    audit: { save: async (event) => { audit.push(event); } },
  });
  assert.equal(review.decision, 'excluded');
  assert.equal(review.overridesIntake, true);
  assert.equal(audit.length, 1);
  assert.equal((audit[0] as { aggregateType: string }).aggregateType, 'source');
});

test('requires a meaningful review reason', async () => {
  await assert.rejects(() => submitSourceReview({
    sourceId: 'pmid:1', decision: 'included', reason: 'because', reviewerId: 'owner',
  }, {
    decisions: { save: async () => { throw new Error('should not run'); } },
    audit: { save: async () => undefined },
  }), /12–600/);
});
