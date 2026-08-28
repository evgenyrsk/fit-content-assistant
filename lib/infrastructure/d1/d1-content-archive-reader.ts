import type { D1Database } from '@cloudflare/workers-types';
import type { ContentArchiveReader } from '../../application/ports/content-archive-reader.ts';
import type { ContentArchiveItem } from '../../domain/index.ts';

interface ContentRow {
  id: string; format: ContentArchiveItem['format']; title: string;
  status: ContentArchiveItem['status']; style_profile_version: string;
  fragment_count: number; claim_count: number; updated_at: string;
}

export class D1ContentArchiveReader implements ContentArchiveReader {
  constructor(private readonly database: D1Database) {}

  async listLatest(limit: number): Promise<ContentArchiveItem[]> {
    const result = await this.database.prepare(`
      SELECT ci.id, ci.format, ci.title, ci.status, ci.style_profile_version, ci.updated_at,
        COUNT(DISTINCT cf.id) AS fragment_count,
        COUNT(DISTINCT cc.claim_version_id) AS claim_count
      FROM content_items ci
      LEFT JOIN content_fragments cf ON cf.content_item_id = ci.id
      LEFT JOIN content_claims cc ON cc.content_fragment_id = cf.id
      GROUP BY ci.id ORDER BY ci.updated_at DESC LIMIT ?
    `).bind(Math.min(Math.max(limit, 1), 100)).all<ContentRow>();
    return result.results.map((row) => ({
      id: row.id, format: row.format, title: row.title, status: row.status,
      styleProfileVersion: row.style_profile_version, fragmentCount: Number(row.fragment_count),
      claimCount: Number(row.claim_count), updatedAt: row.updated_at,
    }));
  }
}
