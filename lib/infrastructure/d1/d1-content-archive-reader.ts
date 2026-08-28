import type { D1Database } from '@cloudflare/workers-types';
import type { ContentArchiveReader } from '../../application/ports/content-archive-reader.ts';
import type { ContentArchiveItem } from '../../domain/index.ts';

interface ContentRow {
  id: string; format: ContentArchiveItem['format']; title: string;
  status: ContentArchiveItem['status']; style_profile_version: string;
  fragment_count: number; claim_count: number; version_count: number; updated_at: string;
  content_text: string | null; fragment_kind: ContentArchiveItem['fragmentKind'] | null;
  claim_version_ids: string | null; editorial_status: ContentArchiveItem['operation']['editorialStatus'] | null;
  scheduled_for: string | null; published_at: string | null; publication_url: string | null;
  operation_updated_at: string | null;
}

function text(value: string | null): string { return value === null ? '' : value; }
function optional(value: string | null): string | undefined { return value === null ? undefined : value; }

function mapRow(row: ContentRow): ContentArchiveItem {
  const editorialStatus = row.editorial_status === null
    ? (row.status === 'ready_for_human_review' ? 'ready' : 'draft') : row.editorial_status;
  return {
    id: row.id, format: row.format, title: row.title, status: row.status,
    styleProfileVersion: row.style_profile_version, text: text(row.content_text),
    fragmentKind: row.fragment_kind === null ? 'fact' : row.fragment_kind,
    claimVersionIds: row.claim_version_ids === null ? [] : row.claim_version_ids.split(',').filter(Boolean),
    fragmentCount: Number(row.fragment_count), claimCount: Number(row.claim_count),
    versionCount: Number(row.version_count), updatedAt: row.updated_at,
    operation: {
      editorialStatus, scheduledFor: optional(row.scheduled_for), publishedAt: optional(row.published_at),
      publicationUrl: optional(row.publication_url), updatedAt: optional(row.operation_updated_at) ?? row.updated_at,
    },
  };
}

export class D1ContentArchiveReader implements ContentArchiveReader {
  constructor(private readonly database: D1Database) {}

  async listLatest(limit: number): Promise<ContentArchiveItem[]> {
    const result = await this.database.prepare(`
      SELECT ci.id, ci.format, ci.title, ci.status, ci.style_profile_version, ci.updated_at,
        COUNT(DISTINCT cf.id) AS fragment_count,
        COUNT(DISTINCT cc.claim_version_id) AS claim_count,
        (SELECT COUNT(*) FROM content_item_versions civ WHERE civ.content_item_id = ci.id) AS version_count,
        (SELECT GROUP_CONCAT(text, '\n\n') FROM content_fragments WHERE content_item_id = ci.id) AS content_text,
        (SELECT kind FROM content_fragments WHERE content_item_id = ci.id ORDER BY position LIMIT 1) AS fragment_kind,
        (SELECT GROUP_CONCAT(DISTINCT cc2.claim_version_id) FROM content_claims cc2
          JOIN content_fragments cf2 ON cf2.id = cc2.content_fragment_id WHERE cf2.content_item_id = ci.id) AS claim_version_ids,
        co.editorial_status, co.scheduled_for, co.published_at, co.publication_url,
        co.updated_at AS operation_updated_at
      FROM content_items ci
      LEFT JOIN content_fragments cf ON cf.content_item_id = ci.id
      LEFT JOIN content_claims cc ON cc.content_fragment_id = cf.id
      LEFT JOIN content_operations co ON co.content_item_id = ci.id
      GROUP BY ci.id ORDER BY ci.updated_at DESC LIMIT ?
    `).bind(Math.min(Math.max(limit, 1), 100)).all<ContentRow>();
    return result.results.map(mapRow);
  }
}
