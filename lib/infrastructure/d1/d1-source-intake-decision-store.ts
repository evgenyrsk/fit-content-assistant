import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { SourceIntakeDecisionStore } from '../../application/ports/source-intake-decision-store.ts';
import type { SourceIntakeDecision } from '../../domain/index.ts';

function decisionStatements(
  database: D1Database,
  researchRunId: string,
  decision: SourceIntakeDecision,
): D1PreparedStatement[] {
  return [
    database.prepare(`
      INSERT INTO source_intake_decisions (
        research_run_id, source_id, decision, reasons_json, policy_version,
        record_status, content_level, publication_types_json, abstract_characters, evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(research_run_id, source_id) DO UPDATE SET
        decision = excluded.decision, reasons_json = excluded.reasons_json,
        policy_version = excluded.policy_version, record_status = excluded.record_status,
        content_level = excluded.content_level, publication_types_json = excluded.publication_types_json,
        abstract_characters = excluded.abstract_characters, evaluated_at = excluded.evaluated_at
    `).bind(
      researchRunId, decision.sourceId, decision.decision, JSON.stringify(decision.reasons),
      decision.policyVersion, decision.recordStatus, decision.contentLevel,
      JSON.stringify(decision.publicationTypes), decision.abstractCharacters, decision.evaluatedAt,
    ),
    database.prepare(`
      UPDATE research_run_sources SET disposition = ?
      WHERE research_run_id = ? AND source_id = ?
    `).bind(decision.decision, researchRunId, decision.sourceId),
    database.prepare(`
      UPDATE sources SET record_status = ?, last_checked_at = ? WHERE id = ?
    `).bind(decision.recordStatus, decision.evaluatedAt, decision.sourceId),
  ];
}

export class D1SourceIntakeDecisionStore implements SourceIntakeDecisionStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async saveAll(researchRunId: string, decisions: SourceIntakeDecision[]): Promise<void> {
    const statements = decisions.flatMap((decision) => decisionStatements(this.database, researchRunId, decision));
    if (statements.length > 0) await this.database.batch(statements);
  }
}
