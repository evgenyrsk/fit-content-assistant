import type { D1Database } from '@cloudflare/workers-types';
import type { SourceReviewDecisionStore } from '../../application/ports/source-review-decision-store.ts';
import type { HumanSourceReview, SourceReviewSubmission } from '../../domain/index.ts';

interface IntakeRow {
  decision: 'admitted_to_triage' | 'rejected';
}

function isOverride(submission: SourceReviewSubmission, intake: IntakeRow): boolean {
  if (submission.decision === 'included') return intake.decision === 'rejected';
  if (submission.decision === 'excluded') return intake.decision === 'admitted_to_triage';
  return false;
}

export class D1SourceReviewDecisionStore implements SourceReviewDecisionStore {
  constructor(private readonly database: D1Database) {}

  async save(submission: SourceReviewSubmission, createdAt: string): Promise<HumanSourceReview> {
    const intake = await this.database.prepare(`
      SELECT decision FROM source_intake_decisions
      WHERE source_id = ? ORDER BY evaluated_at DESC LIMIT 1
    `).bind(submission.sourceId).first<IntakeRow>();
    if (!intake) throw new Error('Source intake decision not found');
    const review: HumanSourceReview = {
      id: crypto.randomUUID(), decision: submission.decision, reason: submission.reason,
      reviewerId: submission.reviewerId, createdAt,
      overridesIntake: isOverride(submission, intake),
    };
    await this.database.prepare(`
      INSERT INTO source_review_decisions (
        id, source_id, decision, reason, reviewer_id, overrides_intake, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      review.id, submission.sourceId, review.decision, review.reason,
      review.reviewerId, review.overridesIntake ? 1 : 0, review.createdAt,
    ).run();
    return review;
  }
}
