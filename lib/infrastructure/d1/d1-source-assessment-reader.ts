import type { D1Database } from '@cloudflare/workers-types';
import type { SourceAssessmentReader } from '../../application/ports/source-assessment-reader.ts';
import { effectiveStudyDecision, type SourceAssessmentSummary } from '../../domain/index.ts';

interface AssessmentRow {
  id: string;
  source_id: string;
  result_id: string;
  question_type: SourceAssessmentSummary['questionType'];
  study_design: SourceAssessmentSummary['studyDesign'];
  decision: SourceAssessmentSummary['decision'];
  reasons_json: string;
  methodology_version: string;
  created_at: string;
  direction: SourceAssessmentSummary['finding']['direction'];
  effect_estimate: string;
  statistical_uncertainty: string;
  practical_significance: string;
  provenance_ids_json: string;
  review_id: string | null;
  review_decision: NonNullable<SourceAssessmentSummary['humanReview']>['decision'] | null;
  finding_checked: number | null;
  provenance_checked: number | null;
  scope_checked: number | null;
  review_reason: string | null;
  reviewer_id: string | null;
  review_created_at: string | null;
}

function stringList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export class D1SourceAssessmentReader implements SourceAssessmentReader {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async listForResearchRun(researchRunId: string): Promise<SourceAssessmentSummary[]> {
    const result = await this.database.prepare(`
      WITH ranked_assessments AS (
        SELECT sa.*, rra.research_run_id,
          ROW_NUMBER() OVER (PARTITION BY sa.source_id ORDER BY sa.created_at DESC, sa.id DESC) AS rank
        FROM research_run_assessments rra
        JOIN source_assessments sa ON sa.id = rra.source_assessment_id
        WHERE rra.research_run_id = ?
      ), ranked_reviews AS (
        SELECT review.*,
          ROW_NUMBER() OVER (PARTITION BY review.source_assessment_id ORDER BY review.created_at DESC, review.id DESC) AS rank
        FROM source_assessment_human_reviews review
      )
      SELECT sa.id, sa.source_id, sa.result_id, sa.question_type, sa.study_design,
        sa.decision, sa.reasons_json, sa.methodology_version, sa.created_at,
        f.direction, f.effect_estimate, f.statistical_uncertainty,
        f.practical_significance, f.provenance_ids_json,
        review.id AS review_id, review.decision AS review_decision,
        review.finding_checked, review.provenance_checked, review.scope_checked,
        review.reason AS review_reason, review.reviewer_id, review.created_at AS review_created_at
      FROM ranked_assessments sa
      JOIN source_assessment_findings f ON f.source_assessment_id = sa.id
      LEFT JOIN ranked_reviews review ON review.source_assessment_id = sa.id AND review.rank = 1
      WHERE sa.rank = 1 ORDER BY sa.created_at, sa.id
    `).bind(researchRunId).all<AssessmentRow>();
    return result.results.map((row) => {
      const humanReview = row.review_id && row.review_decision && row.review_reason
        && row.reviewer_id && row.review_created_at ? {
          id: row.review_id, assessmentId: row.id, decision: row.review_decision,
          findingChecked: Boolean(row.finding_checked), provenanceChecked: Boolean(row.provenance_checked),
          scopeChecked: Boolean(row.scope_checked), reason: row.review_reason,
          reviewerId: row.reviewer_id, createdAt: row.review_created_at,
        } : undefined;
      const decision = effectiveStudyDecision(row.decision, humanReview?.decision);
      return {
      id: row.id, sourceId: row.source_id, resultId: row.result_id,
      questionType: row.question_type, studyDesign: row.study_design,
      decision, reasons: stringList(row.reasons_json) as SourceAssessmentSummary['reasons'],
      finding: {
        direction: row.direction, effectEstimate: row.effect_estimate,
        statisticalUncertainty: row.statistical_uncertainty,
        practicalSignificance: row.practical_significance,
        provenanceIds: stringList(row.provenance_ids_json),
      },
      methodologyVersion: row.methodology_version, createdAt: row.created_at, humanReview,
    }; });
  }
}
