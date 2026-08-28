import type { D1Database } from '@cloudflare/workers-types';
import type { ResearchArchiveReader } from '../../application/ports/research-archive-reader.ts';
import type { ResearchArchiveItem } from '../../domain/index.ts';

interface ResearchRow {
  id: string; query: string; mode: string; status: ResearchArchiveItem['status'];
  source_count: number; assessment_count: number; claim_count: number;
  started_at: string; completed_at: string | null;
}

export class D1ResearchArchiveReader implements ResearchArchiveReader {
  constructor(private readonly database: D1Database) {}

  async listLatest(limit: number): Promise<ResearchArchiveItem[]> {
    const result = await this.database.prepare(`
      SELECT rr.id, rr.query, rr.mode, rr.status, rr.started_at, rr.completed_at,
        (SELECT COUNT(*) FROM research_run_sources rrs WHERE rrs.research_run_id = rr.id) AS source_count,
        (SELECT COUNT(*) FROM research_run_assessments rra WHERE rra.research_run_id = rr.id) AS assessment_count,
        (SELECT COUNT(*) FROM audit_events ae WHERE ae.aggregate_type = 'research_run'
          AND ae.aggregate_id = rr.id AND ae.event_type LIKE '%claim%') AS claim_count
      FROM research_runs rr ORDER BY rr.started_at DESC LIMIT ?
    `).bind(Math.min(Math.max(limit, 1), 100)).all<ResearchRow>();
    return result.results.map((row) => ({
      id: row.id, query: row.query, mode: row.mode, status: row.status,
      sourceCount: Number(row.source_count), assessmentCount: Number(row.assessment_count),
      claimCount: Number(row.claim_count), startedAt: row.started_at, completedAt: row.completed_at ?? undefined,
    }));
  }
}
