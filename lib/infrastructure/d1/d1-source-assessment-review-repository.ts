import type { D1Database } from '@cloudflare/workers-types';
import type { SourceAssessmentReviewRepository } from '../../application/ports/source-assessment-review-repository.ts';
import type {
  SourceAssessmentHumanReview,
  SourceAssessmentReviewContext,
} from '../../domain/index.ts';

interface ContextRow {
  assessment_id: string;
  research_run_id: string;
  source_id: string;
  model_decision: SourceAssessmentReviewContext['modelDecision'];
}

export class D1SourceAssessmentReviewRepository implements SourceAssessmentReviewRepository {
  constructor(private readonly database: D1Database) {}

  async findContext(assessmentId: string): Promise<SourceAssessmentReviewContext | null> {
    const row = await this.database.prepare(`
      SELECT sa.id AS assessment_id, rra.research_run_id, sa.source_id,
        sa.decision AS model_decision
      FROM source_assessments sa
      JOIN research_run_assessments rra ON rra.source_assessment_id = sa.id
      WHERE sa.id = ? LIMIT 1
    `).bind(assessmentId).first<ContextRow>();
    return row ? {
      assessmentId: row.assessment_id, researchRunId: row.research_run_id,
      sourceId: row.source_id, modelDecision: row.model_decision,
    } : null;
  }

  async save(review: SourceAssessmentHumanReview): Promise<void> {
    await this.database.prepare(`
      INSERT INTO source_assessment_human_reviews (
        id, source_assessment_id, decision, finding_checked, provenance_checked,
        scope_checked, reason, reviewer_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      review.id, review.assessmentId, review.decision, review.findingChecked ? 1 : 0,
      review.provenanceChecked ? 1 : 0, review.scopeChecked ? 1 : 0,
      review.reason, review.reviewerId, review.createdAt,
    ).run();
  }
}
