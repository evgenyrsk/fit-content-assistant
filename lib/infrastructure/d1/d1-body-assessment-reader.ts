import type { D1Database } from '@cloudflare/workers-types';
import { evaluateBodyGate, methodologyRelease, type BodyAssessmentRecord, type BodyOfEvidenceAssessment, type SourceAssessmentSummary } from '../../domain/index.ts';

interface BodyRow {
  id: string;
  research_run_id: string;
  outcome_id: string;
  initial_certainty: BodyOfEvidenceAssessment['initialCertainty'];
  proposed_certainty: BodyOfEvidenceAssessment['proposedCertainty'];
  domains_json: string;
  rationale: string;
  human_review: BodyOfEvidenceAssessment['humanReview'];
  methodology_version: string;
  created_at: string;
}

function domains(value: string): BodyOfEvidenceAssessment['domains'] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as BodyOfEvidenceAssessment['domains'] : [];
  } catch {
    return [];
  }
}

export class D1BodyAssessmentReader {
  constructor(private readonly database: D1Database) {}

  async findById(id: string, summaries: SourceAssessmentSummary[]): Promise<BodyAssessmentRecord | null> {
    const row = await this.database.prepare(`
      SELECT id, research_run_id, outcome_id, initial_certainty, proposed_certainty,
        domains_json, rationale, human_review, methodology_version, created_at
      FROM body_assessments WHERE id = ?
    `).bind(id).first<BodyRow>();
    if (!row) return null;
    const eligible = summaries.filter((item) => item.decision === 'eligible_for_synthesis');
    const assessment: BodyOfEvidenceAssessment = {
      outcomeId: row.outcome_id, questionId: row.research_run_id,
      eligibleStudyAssessmentIds: eligible.map((item) => item.id),
      contradictoryStudyAssessmentIds: eligible.filter((item) => ['contradicting', 'mixed'].includes(item.finding.direction)).map((item) => item.id),
      domains: domains(row.domains_json), initialCertainty: row.initial_certainty,
      proposedCertainty: row.proposed_certainty, rationale: row.rationale,
      humanReview: row.human_review, methodologyVersion: row.methodology_version,
    };
    return {
      id: row.id, researchRunId: row.research_run_id, assessment,
      gate: evaluateBodyGate(assessment, methodologyRelease.calibrated), createdAt: row.created_at,
    };
  }
}
