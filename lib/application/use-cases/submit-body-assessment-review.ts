import type { AuditEventStore } from '../ports/audit-event-store.ts';
import type { BodyAssessmentReviewRepository } from '../ports/body-assessment-review-repository.ts';
import type { BodyAssessmentHumanReview, EvidenceReviewDecision } from '../../domain/index.ts';

export interface BodyAssessmentReviewInput {
  bodyAssessmentId: string;
  decision: EvidenceReviewDecision;
  evidenceSetChecked: boolean;
  contradictionsChecked: boolean;
  certaintyChecked: boolean;
  scopeChecked: boolean;
  reason: string;
  reviewerId: string;
}

interface Dependencies {
  reviews: BodyAssessmentReviewRepository;
  audit: AuditEventStore;
  now?: () => Date;
  createId?: () => string;
}

const decisions: EvidenceReviewDecision[] = ['confirmed', 'rejected', 'needs_more_information'];

function validate(input: BodyAssessmentReviewInput): void {
  if (!decisions.includes(input.decision)) throw new Error('invalid_review');
  if (input.reason.trim().replace(/\s+/g, ' ').length < 12 || input.reason.trim().length > 600) throw new Error('invalid_reason');
  if (input.decision === 'confirmed' && ![
    input.evidenceSetChecked, input.contradictionsChecked, input.certaintyChecked, input.scopeChecked,
  ].every(Boolean)) throw new Error('checks_required');
}

export async function submitBodyAssessmentReview(
  input: BodyAssessmentReviewInput,
  dependencies: Dependencies,
): Promise<BodyAssessmentHumanReview> {
  const context = await dependencies.reviews.findContext(input.bodyAssessmentId.trim());
  if (!context) throw new Error('assessment_not_found');
  validate(input);
  const createdAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const review: BodyAssessmentHumanReview = {
    id: (dependencies.createId ?? (() => crypto.randomUUID()))(), bodyAssessmentId: context.bodyAssessmentId,
    decision: input.decision, evidenceSetChecked: input.evidenceSetChecked,
    contradictionsChecked: input.contradictionsChecked, certaintyChecked: input.certaintyChecked,
    scopeChecked: input.scopeChecked, reason: input.reason.trim().replace(/\s+/g, ' '),
    reviewerId: input.reviewerId, createdAt,
  };
  await dependencies.reviews.save(review);
  await dependencies.audit.save({
    id: crypto.randomUUID(), aggregateType: 'body_assessment', aggregateId: context.bodyAssessmentId,
    eventType: 'body_assessment_human_reviewed', actorType: 'human', occurredAt: createdAt,
    payload: { decision: review.decision, researchRunId: context.researchRunId },
  });
  return review;
}
