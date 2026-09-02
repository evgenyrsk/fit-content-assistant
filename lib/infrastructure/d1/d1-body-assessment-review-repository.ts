import type { D1Database } from '@cloudflare/workers-types';
import type { BodyAssessmentReviewRepository } from '../../application/ports/body-assessment-review-repository.ts';
import type { BodyAssessmentHumanReview, BodyAssessmentReviewContext } from '../../domain/index.ts';

interface ContextRow { body_assessment_id: string; research_run_id: string }

export class D1BodyAssessmentReviewRepository implements BodyAssessmentReviewRepository {
  constructor(private readonly database: D1Database) {}

  async findContext(bodyAssessmentId: string): Promise<BodyAssessmentReviewContext | null> {
    const row = await this.database.prepare(`
      SELECT id AS body_assessment_id, research_run_id FROM body_assessments WHERE id = ?
    `).bind(bodyAssessmentId).first<ContextRow>();
    return row ? { bodyAssessmentId: row.body_assessment_id, researchRunId: row.research_run_id } : null;
  }

  async save(review: BodyAssessmentHumanReview): Promise<void> {
    const humanReview = review.decision === 'confirmed' ? 'confirmed'
      : review.decision === 'rejected' ? 'rejected' : 'pending';
    await this.database.batch([
      this.database.prepare(`
        INSERT INTO body_assessment_human_reviews (
          id, body_assessment_id, decision, evidence_set_checked, contradictions_checked,
          certainty_checked, scope_checked, reason, reviewer_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        review.id, review.bodyAssessmentId, review.decision, review.evidenceSetChecked ? 1 : 0,
        review.contradictionsChecked ? 1 : 0, review.certaintyChecked ? 1 : 0,
        review.scopeChecked ? 1 : 0, review.reason, review.reviewerId, review.createdAt,
      ),
      this.database.prepare('UPDATE body_assessments SET human_review = ? WHERE id = ?')
        .bind(humanReview, review.bodyAssessmentId),
    ]);
  }
}
