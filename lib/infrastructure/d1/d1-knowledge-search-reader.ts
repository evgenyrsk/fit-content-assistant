import type { D1Database } from '@cloudflare/workers-types';
import type { KnowledgeSearchReader } from '../../application/ports/knowledge-search-reader.ts';
import type { ClaimSearchHit, KnowledgeSearchResult } from '../../domain/index.ts';

interface ClaimRow {
  id: string; statement: string; status: ClaimSearchHit['status']; confidence: ClaimSearchHit['confidence']; review_due_at: string;
}
interface EvidenceRow {
  id: string; source_id: string; title: string; content: string; locator: string;
  record_status: string; content_level: string | null; reuse_status: string | null; review_decision: string | null;
}

function excerpt(content: string, query: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const position = normalized.toLocaleLowerCase('ru').indexOf(query.toLocaleLowerCase('ru'));
  const start = Math.max(0, position - 90);
  const slice = normalized.slice(start, start + 260);
  return `${start > 0 ? '…' : ''}${slice}${start + 260 < normalized.length ? '…' : ''}`;
}

export class D1KnowledgeSearchReader implements KnowledgeSearchReader {
  constructor(private readonly database: D1Database) {}

  async search(query: string, limit: number): Promise<KnowledgeSearchResult> {
    const pattern = `%${query.toLocaleLowerCase('ru')}%`;
    const bounded = Math.min(Math.max(limit, 1), 20);
    const [claims, evidence] = await Promise.all([
      this.database.prepare(`
        WITH latest AS (SELECT claim_id, MAX(version) AS version FROM claim_versions GROUP BY claim_id)
        SELECT cv.id, cv.statement, cv.status, cv.confidence, cv.review_due_at
        FROM claim_versions cv JOIN latest l ON l.claim_id = cv.claim_id AND l.version = cv.version
        WHERE LOWER(cv.statement) LIKE ?
        ORDER BY CASE WHEN LOWER(cv.statement) = LOWER(?) THEN 0
          WHEN LOWER(cv.statement) LIKE LOWER(?) THEN 1 ELSE 2 END, cv.created_at DESC LIMIT ?
      `).bind(pattern, query, `${query}%`, bounded).all<ClaimRow>(),
      this.database.prepare(`
        WITH latest_review AS (
          SELECT source_id, decision, ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY created_at DESC, id DESC) AS position
          FROM source_review_decisions
        )
        SELECT sc.id, sc.source_id, s.title, sc.content, sc.locator, s.record_status,
          sd.content_level, sd.reuse_status, lr.decision AS review_decision
        FROM source_chunks sc JOIN sources s ON s.id = sc.source_id
        LEFT JOIN source_documents sd ON sd.source_id = s.id
        LEFT JOIN latest_review lr ON lr.source_id = s.id AND lr.position = 1
        WHERE LOWER(sc.content) LIKE ?
        ORDER BY CASE WHEN LOWER(sc.content) LIKE LOWER(?) THEN 0 ELSE 1 END, sc.created_at DESC LIMIT ?
      `).bind(pattern, `${query}%`, bounded).all<EvidenceRow>(),
    ]);
    return {
      query,
      claims: claims.results.map((row) => ({
        kind: 'claim', id: row.id, title: row.statement, excerpt: excerpt(row.statement, query),
        status: row.status, confidence: row.confidence, reviewDueAt: row.review_due_at,
      })),
      evidence: evidence.results.map((row) => ({
        kind: 'evidence', id: row.id, sourceId: row.source_id, title: row.title,
        excerpt: excerpt(row.content, query), locator: row.locator, recordStatus: row.record_status,
        admissible: row.record_status === 'active' && row.content_level === 'full_text'
          && ['permitted', 'user_attested'].includes(row.reuse_status ?? '') && row.review_decision === 'included',
      })),
      separationEnforced: true,
    };
  }
}
