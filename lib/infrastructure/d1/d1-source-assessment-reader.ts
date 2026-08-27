import type { D1Database } from '@cloudflare/workers-types';
import type { SourceAssessmentReader } from '../../application/ports/source-assessment-reader.ts';
import type { SourceAssessmentSummary } from '../../domain/index.ts';

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
      SELECT sa.id, sa.source_id, sa.result_id, sa.question_type, sa.study_design,
        sa.decision, sa.reasons_json, sa.methodology_version, sa.created_at,
        f.direction, f.effect_estimate, f.statistical_uncertainty,
        f.practical_significance, f.provenance_ids_json
      FROM research_run_assessments rra
      JOIN source_assessments sa ON sa.id = rra.source_assessment_id
      JOIN source_assessment_findings f ON f.source_assessment_id = sa.id
      WHERE rra.research_run_id = ? ORDER BY sa.created_at, sa.id
    `).bind(researchRunId).all<AssessmentRow>();
    return result.results.map((row) => ({
      id: row.id, sourceId: row.source_id, resultId: row.result_id,
      questionType: row.question_type, studyDesign: row.study_design,
      decision: row.decision, reasons: stringList(row.reasons_json) as SourceAssessmentSummary['reasons'],
      finding: {
        direction: row.direction, effectEstimate: row.effect_estimate,
        statisticalUncertainty: row.statistical_uncertainty,
        practicalSignificance: row.practical_significance,
        provenanceIds: stringList(row.provenance_ids_json),
      },
      methodologyVersion: row.methodology_version, createdAt: row.created_at,
    }));
  }
}
