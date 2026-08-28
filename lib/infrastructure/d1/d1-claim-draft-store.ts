import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { ClaimDraftStore } from '../../application/ports/claim-draft-store.ts';
import type { ClaimDraftRecord, SavedClaimVersion } from '../../domain/index.ts';

interface ExistingClaimRow {
  id: string;
  latest_version: number | null;
  latest_version_id: string | null;
}

async function textHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class D1ClaimDraftStore implements ClaimDraftStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  private async existing(stableKey: string): Promise<ExistingClaimRow | null> {
    return this.database.prepare(`
      SELECT c.id, MAX(cv.version) AS latest_version,
        (SELECT id FROM claim_versions WHERE claim_id = c.id ORDER BY version DESC LIMIT 1) AS latest_version_id
      FROM claims c LEFT JOIN claim_versions cv ON cv.claim_id = c.id
      WHERE c.stable_key = ? GROUP BY c.id
    `).bind(stableKey).first<ExistingClaimRow>();
  }

  async save(record: ClaimDraftRecord): Promise<SavedClaimVersion> {
    const previous = await this.existing(record.stableKey);
    const claimId = previous?.id ?? crypto.randomUUID();
    const version = (previous?.latest_version ?? 0) + 1;
    const topicHash = await textHash(record.topic.trim().toLowerCase());
    const topicId = `topic:${topicHash.slice(0, 24)}`;
    const statements: D1PreparedStatement[] = [
      this.database.prepare(`
        INSERT INTO topics (id, parent_id, slug, name, created_at)
        VALUES (?, NULL, ?, ?, ?) ON CONFLICT(slug) DO NOTHING
      `).bind(topicId, `topic-${topicHash.slice(0, 24)}`, record.topic, record.createdAt),
    ];
    if (!previous) {
      statements.push(this.database.prepare(`
        INSERT INTO claims (id, topic_id, stable_key, created_at) VALUES (?, ?, ?, ?)
      `).bind(claimId, topicId, record.stableKey, record.createdAt));
    }
    if (previous?.latest_version_id) {
      statements.push(this.database.prepare(`
        UPDATE claim_versions SET status = 'superseded' WHERE id = ?
      `).bind(previous.latest_version_id));
    }
    statements.push(this.database.prepare(`
      INSERT INTO claim_versions (
        id, claim_id, version, statement, scope_json, confidence, limitations_json,
        status, methodology_version, reviewed_at, review_due_at, supersedes_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'needs_review', ?, NULL, ?, ?, ?)
    `).bind(
      record.id, claimId, version, record.statement, JSON.stringify(record.scope),
      record.confidence, JSON.stringify(record.limitations), record.methodologyVersion,
      record.reviewDueAt, previous?.latest_version_id ?? null, record.createdAt,
    ));
    statements.push(...record.evidence.map((item) => this.database.prepare(`
      INSERT INTO claim_evidence (
        claim_version_id, source_chunk_id, source_assessment_id, direction, weight
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(record.id, item.sourceChunkId, item.sourceAssessmentId ?? null, item.direction, item.weight)));
    await this.database.batch(statements);
    return { claimId, versionId: record.id, version };
  }
}
