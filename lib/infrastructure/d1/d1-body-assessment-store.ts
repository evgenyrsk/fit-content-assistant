import type { D1Database } from '@cloudflare/workers-types';
import type { BodyAssessmentStore } from '../../application/ports/body-assessment-store.ts';
import type { BodyAssessmentRecord } from '../../domain/index.ts';

export class D1BodyAssessmentStore implements BodyAssessmentStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async save(record: BodyAssessmentRecord): Promise<void> {
    const body = record.assessment;
    await this.database.prepare(`
      INSERT INTO body_assessments (
        id, research_run_id, outcome_id, initial_certainty, proposed_certainty,
        domains_json, rationale, human_review, methodology_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.id, record.researchRunId, body.outcomeId, body.initialCertainty,
      body.proposedCertainty, JSON.stringify(body.domains), body.rationale,
      body.humanReview, body.methodologyVersion, record.createdAt,
    ).run();
  }
}
