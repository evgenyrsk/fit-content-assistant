import type { AuditEventStore } from '../ports/audit-event-store.ts';
import type { SourceAssessmentReviewRepository } from '../ports/source-assessment-review-repository.ts';
import type {
  EvidenceReviewDecision,
  SourceAssessmentHumanReview,
  SourceAssessmentReviewContext,
} from '../../domain/index.ts';

export interface SourceAssessmentReviewInput {
  assessmentId: string;
  decision: EvidenceReviewDecision;
  findingChecked: boolean;
  provenanceChecked: boolean;
  scopeChecked: boolean;
  reason: string;
  reviewerId: string;
}

interface Dependencies {
  reviews: SourceAssessmentReviewRepository;
  audit: AuditEventStore;
  now?: () => Date;
  createId?: () => string;
}

const decisions: EvidenceReviewDecision[] = ['confirmed', 'rejected', 'needs_more_information'];

function validate(input: SourceAssessmentReviewInput, context: SourceAssessmentReviewContext): void {
  if (!decisions.includes(input.decision) || input.assessmentId !== context.assessmentId) throw new Error('invalid_review');
  if (input.reason.trim().replace(/\s+/g, ' ').length < 12 || input.reason.trim().length > 600) throw new Error('invalid_reason');
  if (input.decision !== 'confirmed') return;
  if (!input.findingChecked || !input.provenanceChecked || !input.scopeChecked) throw new Error('checks_required');
  if (['excluded', 'context_only'].includes(context.modelDecision)) throw new Error('hard_stop');
}

export async function submitSourceAssessmentReview(
  input: SourceAssessmentReviewInput,
  dependencies: Dependencies,
): Promise<SourceAssessmentHumanReview> {
  const context = await dependencies.reviews.findContext(input.assessmentId.trim());
  if (!context) throw new Error('assessment_not_found');
  validate(input, context);
  const createdAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const review: SourceAssessmentHumanReview = {
    id: (dependencies.createId ?? (() => crypto.randomUUID()))(), assessmentId: context.assessmentId,
    decision: input.decision, findingChecked: input.findingChecked,
    provenanceChecked: input.provenanceChecked, scopeChecked: input.scopeChecked,
    reason: input.reason.trim().replace(/\s+/g, ' '), reviewerId: input.reviewerId, createdAt,
  };
  await dependencies.reviews.save(review);
  await dependencies.audit.save({
    id: crypto.randomUUID(), aggregateType: 'source_assessment', aggregateId: context.assessmentId,
    eventType: 'source_assessment_human_reviewed', actorType: 'human', occurredAt: createdAt,
    payload: { decision: review.decision, sourceId: context.sourceId, researchRunId: context.researchRunId },
  });
  return review;
}
