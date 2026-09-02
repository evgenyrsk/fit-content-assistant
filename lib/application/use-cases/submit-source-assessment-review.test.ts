import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuditEventRecord } from '../ports/audit-event-store.ts';
import type { SourceAssessmentHumanReview, SourceAssessmentReviewContext } from '../../domain/index.ts';
import { submitSourceAssessmentReview } from './submit-source-assessment-review.ts';

function dependencies(modelDecision: SourceAssessmentReviewContext['modelDecision'] = 'needs_human_review') {
  let saved: SourceAssessmentHumanReview | null = null;
  const audit: AuditEventRecord[] = [];
  return {
    state: () => ({ saved, audit }),
    value: {
      reviews: {
        findContext: async () => ({ assessmentId: 'a1', researchRunId: 'r1', sourceId: 's1', modelDecision }),
        save: async (review: SourceAssessmentHumanReview) => { saved = review; },
      },
      audit: { save: async (event: AuditEventRecord) => { audit.push(event); } },
      now: () => new Date('2026-09-02T10:00:00.000Z'), createId: () => 'review-1',
    },
  };
}

const approval = {
  assessmentId: 'a1', decision: 'confirmed' as const, findingChecked: true,
  provenanceChecked: true, scopeChecked: true,
  reason: 'Проверены результат, фрагменты и границы применимости.', reviewerId: 'owner',
};

test('stores an explicit source assessment confirmation and audit event', async () => {
  const setup = dependencies();
  const review = await submitSourceAssessmentReview(approval, setup.value);
  assert.equal(review.decision, 'confirmed');
  assert.equal(setup.state().saved?.id, 'review-1');
  assert.equal(setup.state().audit[0]?.eventType, 'source_assessment_human_reviewed');
});

test('blocks confirmation when a required human check is missing', async () => {
  await assert.rejects(() => submitSourceAssessmentReview({ ...approval, scopeChecked: false }, dependencies().value), /checks_required/);
});

test('does not allow a human confirmation to override deterministic context-only status', async () => {
  await assert.rejects(() => submitSourceAssessmentReview(approval, dependencies('context_only').value), /hard_stop/);
});
