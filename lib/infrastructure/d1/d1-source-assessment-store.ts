import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { SourceAssessmentStore } from '../../application/ports/source-assessment-store.ts';
import type { SourceAssessmentRecord } from '../../domain/index.ts';

export class D1SourceAssessmentStore implements SourceAssessmentStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async save(record: SourceAssessmentRecord): Promise<void> {
    const statements: D1PreparedStatement[] = [
      this.database.prepare(`
        INSERT INTO source_assessments (
          id, source_id, result_id, question_type, study_design, instrument,
          decision, reasons_json, methodology_version, assessor, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        record.id, record.input.sourceId, record.input.resultId, record.input.questionType,
        record.input.studyDesign, record.route.instrument, record.gate.decision,
        JSON.stringify(record.gate.reasons), record.methodologyVersion, record.assessor, record.createdAt,
      ),
      this.database.prepare(`
        INSERT INTO research_run_assessments (research_run_id, source_assessment_id)
        VALUES (?, ?)
      `).bind(record.researchRunId, record.id),
      this.database.prepare(`
        INSERT INTO source_assessment_findings (
          source_assessment_id, direction, effect_estimate, statistical_uncertainty,
          practical_significance, provenance_ids_json
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        record.id, record.finding.direction, record.finding.effectEstimate,
        record.finding.statisticalUncertainty, record.finding.practicalSignificance,
        JSON.stringify(record.finding.provenanceIds),
      ),
      this.database.prepare(`
        INSERT INTO source_assessment_reader_briefs (
          source_assessment_id, plain_language_summary, key_points_json,
          conclusion_allowed, conclusion_not_allowed, trust_profile_json
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        record.id, record.readerBrief.plainLanguageSummary,
        JSON.stringify(record.readerBrief.keyPoints), record.readerBrief.conclusionAllowed,
        record.readerBrief.conclusionNotAllowed, JSON.stringify(record.trustProfile),
      ),
      ...record.input.dimensions.map((item) => this.database.prepare(`
        INSERT INTO study_dimension_assessments (
          id, source_assessment_id, dimension, judgement, rationale, provenance_ids_json, assessor
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), record.id, item.dimension, item.judgement,
        item.rationale, JSON.stringify(item.provenanceIds), item.assessor,
      )),
      ...record.input.integrityChecks.map((item) => this.database.prepare(`
        INSERT INTO study_integrity_checks (
          id, source_assessment_id, check_id, state, rationale, provenance_ids_json, assessor
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), record.id, item.check, item.state,
        item.rationale, JSON.stringify(item.provenanceIds), item.assessor,
      )),
    ];
    await this.database.batch(statements);
  }
}
