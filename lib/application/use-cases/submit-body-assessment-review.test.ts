import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditEventRecord } from '../ports/audit-event-store.ts';
import type { BodyAssessmentHumanReview } from '../../domain/index.ts';
import { submitBodyAssessmentReview } from './submit-body-assessment-review.ts';

function dependencies() {
  let saved: BodyAssessmentHumanReview | null = null;
  return {
    state: () => saved,
    value: {
      reviews: {
        findContext: async () => ({ bodyAssessmentId: 'b1', researchRunId: 'r1' }),
        save: async (review: BodyAssessmentHumanReview) => { saved = review; },
      },
      audit: { save: async () => undefined } as { save: (event: AuditEventRecord) => Promise<void> },
      now: () => new Date('2026-09-02T10:00:00.000Z'), createId: () => 'review-1',
    },
  };
}

const confirmation = {
  bodyAssessmentId: 'b1', decision: 'confirmed' as const, evidenceSetChecked: true,
  contradictionsChecked: true, certaintyChecked: true, scopeChecked: true,
  reason: 'Проверены корпус данных, противоречия, certainty и scope.', reviewerId: 'owner',
};

test('stores body confirmation only after every explicit check', async () => {
  const setup = dependencies();
  const review = await submitBodyAssessmentReview(confirmation, setup.value);
  assert.equal(review.decision, 'confirmed');
  assert.equal(setup.state()?.id, 'review-1');
});

test('fails closed when certainty was not checked', async () => {
  await assert.rejects(() => submitBodyAssessmentReview({
    ...confirmation, certaintyChecked: false,
  }, dependencies().value), /checks_required/);
});
