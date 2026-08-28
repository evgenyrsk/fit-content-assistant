import type { D1Database } from '@cloudflare/workers-types';
import type { ManualClaimEvidenceReader } from '../../application/ports/manual-claim-evidence-reader.ts';
import type {
  Confidence, KnowledgeClaimRecord, ManualClaimEvidenceTrace, ManualClaimReviewContext,
  ManualEvidenceOption, ReviewDecision, SourceChunkKind,
} from '../../domain/index.ts';

interface ClaimRow {
  id: string; claim_id: string; version: number; statement: string; topic: string;
  scope_json: string; confidence: Confidence; limitations_json: string;
  status: ReviewDecision | 'superseded'; review_due_at: string; created_at: string;
  evidence_count: number; source_types: string | null;
}

interface EvidenceRow {
  source_chunk_id: string; source_id: string; source_title: string; source_type: string;
  kind: SourceChunkKind; locator: string; excerpt: string;
  direction?: ManualClaimEvidenceTrace['direction']; weight?: ManualClaimEvidenceTrace['weight'];
  eligible_for_approval?: number;
}

function parseObject(value: string): Record<string, string | undefined> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, string | undefined> : {};
  } catch { return {}; }
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

function claim(row: ClaimRow): KnowledgeClaimRecord {
  return {
    id: row.id, claimId: row.claim_id, version: row.version, statement: row.statement,
    topic: row.topic, scope: parseObject(row.scope_json), confidence: row.confidence,
    limitations: parseList(row.limitations_json), status: row.status,
    evidenceCount: Number(row.evidence_count), sourceTypes: row.source_types?.split(',').filter(Boolean) ?? [],
    reviewDueAt: row.review_due_at, createdAt: row.created_at,
  };
}

function option(row: EvidenceRow): ManualEvidenceOption {
  return {
    sourceChunkId: row.source_chunk_id, sourceId: row.source_id, sourceTitle: row.source_title,
    sourceType: row.source_type, kind: row.kind, locator: row.locator, excerpt: row.excerpt,
  };
}

export class D1ManualClaimEvidenceReader implements ManualClaimEvidenceReader {
  constructor(private readonly database: D1Database) {}

  async listEligible(limit: number): Promise<ManualEvidenceOption[]> {
    const result = await this.database.prepare(`
      WITH latest_review AS (
        SELECT source_id, decision, ROW_NUMBER() OVER (
          PARTITION BY source_id ORDER BY created_at DESC, id DESC
        ) AS position FROM source_review_decisions
      )
      SELECT sc.id AS source_chunk_id, s.id AS source_id, s.title AS source_title,
        s.source_type, sc.chunk_kind AS kind, sc.locator, SUBSTR(sc.content, 1, 360) AS excerpt
      FROM source_chunks sc JOIN sources s ON s.id = sc.source_id
      JOIN source_documents sd ON sd.source_id = s.id
      JOIN latest_review lr ON lr.source_id = s.id AND lr.position = 1
      WHERE sd.content_level = 'full_text' AND sd.reuse_status IN ('permitted', 'user_attested')
        AND s.record_status = 'active' AND lr.decision = 'included'
        AND sc.chunk_kind IN ('methods', 'results', 'discussion')
      ORDER BY s.last_checked_at DESC, s.id, sc.locator LIMIT ?
    `).bind(Math.min(Math.max(limit, 1), 100)).all<EvidenceRow>();
    return result.results.map(option);
  }

  async findReviewContext(claimVersionId: string): Promise<ManualClaimReviewContext | null> {
    const row = await this.database.prepare(`
      SELECT cv.id, cv.claim_id, cv.version, cv.statement, COALESCE(t.name, 'Без темы') AS topic,
        cv.scope_json, cv.confidence, cv.limitations_json, cv.status, cv.review_due_at, cv.created_at,
        COUNT(DISTINCT ce.source_chunk_id) AS evidence_count,
        GROUP_CONCAT(DISTINCT s.source_type) AS source_types
      FROM claim_versions cv JOIN claims c ON c.id = cv.claim_id
      LEFT JOIN topics t ON t.id = c.topic_id
      LEFT JOIN claim_evidence ce ON ce.claim_version_id = cv.id
      LEFT JOIN source_chunks sc ON sc.id = ce.source_chunk_id
      LEFT JOIN sources s ON s.id = sc.source_id
      WHERE cv.id = ? GROUP BY cv.id
    `).bind(claimVersionId).first<ClaimRow>();
    if (!row) return null;
    const result = await this.database.prepare(`
      WITH latest_review AS (
        SELECT source_id, decision, ROW_NUMBER() OVER (
          PARTITION BY source_id ORDER BY created_at DESC, id DESC
        ) AS position FROM source_review_decisions
      )
      SELECT sc.id AS source_chunk_id, s.id AS source_id, s.title AS source_title,
        s.source_type, sc.chunk_kind AS kind, sc.locator, SUBSTR(sc.content, 1, 520) AS excerpt,
        ce.direction, ce.weight,
        CASE WHEN sd.content_level = 'full_text'
          AND sd.reuse_status IN ('permitted', 'user_attested')
          AND s.record_status = 'active' AND lr.decision = 'included' THEN 1 ELSE 0 END
          AS eligible_for_approval
      FROM claim_evidence ce JOIN source_chunks sc ON sc.id = ce.source_chunk_id
      JOIN sources s ON s.id = sc.source_id
      LEFT JOIN source_documents sd ON sd.source_id = s.id
      LEFT JOIN latest_review lr ON lr.source_id = s.id AND lr.position = 1
      WHERE ce.claim_version_id = ? ORDER BY s.title, sc.locator
    `).bind(claimVersionId).all<EvidenceRow>();
    const evidence = result.results.map((item) => ({
      ...option(item), direction: item.direction ?? 'neutral', weight: item.weight ?? 'context',
      eligibleForApproval: item.eligible_for_approval === 1,
    }));
    return { claim: claim(row), evidence };
  }
}
