import type { D1Database } from '@cloudflare/workers-types';
import type { KnowledgeClaimReader } from '../../application/ports/knowledge-claim-reader.ts';
import type { Confidence, KnowledgeClaimRecord, ReviewDecision } from '../../domain/index.ts';

interface ClaimRow {
  id: string;
  claim_id: string;
  version: number;
  statement: string;
  topic: string;
  scope_json: string;
  confidence: Confidence;
  limitations_json: string;
  status: ReviewDecision | 'superseded';
  evidence_count: number;
  source_types: string | null;
  review_due_at: string;
  created_at: string;
}

function stringRecord(value: string): Record<string, string | undefined> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, string | undefined> : {};
  } catch {
    return {};
  }
}

function stringList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export class D1KnowledgeClaimReader implements KnowledgeClaimReader {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async listLatest(limit: number): Promise<KnowledgeClaimRecord[]> {
    const result = await this.database.prepare(`
      WITH latest AS (
        SELECT claim_id, MAX(version) AS version FROM claim_versions GROUP BY claim_id
      )
      SELECT cv.id, cv.claim_id, cv.version, cv.statement, COALESCE(t.name, 'Без темы') AS topic,
        cv.scope_json, cv.confidence, cv.limitations_json, cv.status, cv.review_due_at, cv.created_at,
        (SELECT COUNT(*) FROM claim_evidence ce WHERE ce.claim_version_id = cv.id) AS evidence_count,
        (SELECT GROUP_CONCAT(DISTINCT s.source_type) FROM claim_evidence ce
          JOIN source_chunks sc ON sc.id = ce.source_chunk_id JOIN sources s ON s.id = sc.source_id
          WHERE ce.claim_version_id = cv.id) AS source_types
      FROM latest l JOIN claim_versions cv ON cv.claim_id = l.claim_id AND cv.version = l.version
      JOIN claims c ON c.id = cv.claim_id LEFT JOIN topics t ON t.id = c.topic_id
      ORDER BY cv.created_at DESC LIMIT ?
    `).bind(Math.min(Math.max(limit, 1), 100)).all<ClaimRow>();
    return result.results.map((row) => ({
      id: row.id, claimId: row.claim_id, version: row.version, statement: row.statement,
      topic: row.topic, scope: stringRecord(row.scope_json), confidence: row.confidence,
      limitations: stringList(row.limitations_json), status: row.status,
      evidenceCount: Number(row.evidence_count),
      sourceTypes: row.source_types?.split(',').filter(Boolean) ?? [],
      reviewDueAt: row.review_due_at, createdAt: row.created_at,
    }));
  }
}
