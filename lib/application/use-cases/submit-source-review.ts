import type { AuditEventStore } from '../ports/audit-event-store.ts';
import type { SourceReviewDecisionStore } from '../ports/source-review-decision-store.ts';
import type { HumanSourceReview, HumanSourceReviewDecision } from '../../domain/index.ts';

interface SourceReviewInput {
  sourceId: string;
  decision: HumanSourceReviewDecision;
  reason: string;
  reviewerId: string;
}

interface SourceReviewDependencies {
  decisions: SourceReviewDecisionStore;
  audit: AuditEventStore;
  now?: () => Date;
}

const decisions: HumanSourceReviewDecision[] = ['included', 'excluded', 'needs_follow_up'];

function normalize(input: SourceReviewInput): SourceReviewInput {
  const sourceId = input.sourceId.trim();
  const reason = input.reason.trim().replace(/\s+/g, ' ');
  const reviewerId = input.reviewerId.trim();
  if (!sourceId || !reviewerId || !decisions.includes(input.decision)) throw new Error('Invalid review');
  if (reason.length < 12 || reason.length > 600) throw new Error('Review reason must contain 12–600 characters');
  return { sourceId, decision: input.decision, reason, reviewerId };
}

export async function submitSourceReview(
  input: SourceReviewInput,
  dependencies: SourceReviewDependencies,
): Promise<HumanSourceReview> {
  const submission = normalize(input);
  const createdAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const review = await dependencies.decisions.save(submission, createdAt);
  await dependencies.audit.save({
    id: crypto.randomUUID(), aggregateType: 'source', aggregateId: submission.sourceId,
    eventType: 'source_review_recorded', actorType: 'human', occurredAt: createdAt,
    payload: {
      reviewId: review.id, decision: review.decision, reason: review.reason,
      reviewerId: review.reviewerId, overridesIntake: review.overridesIntake,
    },
  });
  return review;
}
