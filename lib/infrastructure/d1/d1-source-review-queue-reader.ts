import type { D1Database } from '@cloudflare/workers-types';
import type { SourceReviewQueueReader } from '../../application/ports/source-review-queue-reader.ts';
import type { SourceReviewQueueItem } from '../../domain/index.ts';

const revalidationIntervalDays = 30;

interface QueueRow {
  source_id: string;
  research_run_id: string;
  query: string;
  title: string;
  url: string;
  pmid: string | null;
  pmcid: string | null;
  source_type: string;
  record_status: SourceReviewQueueItem['recordStatus'];
  content_level: SourceReviewQueueItem['contentLevel'] | null;
  license: string | null;
  original_filename: string | null;
  byte_size: number | null;
  page_count: number | null;
  extracted_characters: number | null;
  rights_basis: NonNullable<SourceReviewQueueItem['manualUpload']>['rightsBasis'] | null;
  processing_status: NonNullable<SourceReviewQueueItem['manualUpload']>['processingStatus'] | null;
  decision: SourceReviewQueueItem['intakeDecision'];
  reasons_json: string;
  policy_version: string;
  last_checked_at: string;
}

function reasons(value: string): SourceReviewQueueItem['intakeReasons'] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as SourceReviewQueueItem['intakeReasons'] : [];
  } catch {
    return [];
  }
}

function dueAt(lastCheckedAt: string): string {
  const date = new Date(lastCheckedAt);
  date.setUTCDate(date.getUTCDate() + revalidationIntervalDays);
  return date.toISOString();
}

function manualUpload(row: QueueRow): SourceReviewQueueItem['manualUpload'] {
  if (!row.original_filename || !row.rights_basis || !row.processing_status) return undefined;
  return {
    fileName: row.original_filename, byteSize: row.byte_size ?? 0,
    pageCount: row.page_count ?? 0, extractedCharacters: row.extracted_characters ?? 0,
    rightsBasis: row.rights_basis, processingStatus: row.processing_status,
  };
}

function toQueueItem(row: QueueRow): SourceReviewQueueItem {
  return {
    sourceId: row.source_id, researchRunId: row.research_run_id, researchQuery: row.query,
    title: row.title, url: row.url, pmid: row.pmid ?? undefined, pmcid: row.pmcid ?? undefined,
    sourceType: row.source_type, recordStatus: row.record_status,
    contentLevel: row.content_level ?? 'metadata_only', license: row.license ?? undefined,
    manualUpload: manualUpload(row),
    intakeDecision: row.decision, intakeReasons: reasons(row.reasons_json),
    policyVersion: row.policy_version, lastCheckedAt: row.last_checked_at,
    revalidationDueAt: dueAt(row.last_checked_at),
  };
}

export class D1SourceReviewQueueReader implements SourceReviewQueueReader {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async listLatest(limit: number): Promise<SourceReviewQueueItem[]> {
    const result = await this.database.prepare(`
      WITH ranked AS (
        SELECT sid.*, ROW_NUMBER() OVER (
          PARTITION BY sid.source_id ORDER BY sid.evaluated_at DESC, sid.research_run_id DESC
        ) AS position
        FROM source_intake_decisions sid
      )
      SELECT r.source_id, r.research_run_id, rr.query, s.title, s.url, s.pmid,
        sd.pmcid, s.source_type, s.record_status, sd.content_level, sd.license,
        mi.original_filename, mi.byte_size, mi.page_count, mi.extracted_characters,
        mi.rights_basis, mi.processing_status,
        r.decision, r.reasons_json, r.policy_version, s.last_checked_at
      FROM ranked r JOIN sources s ON s.id = r.source_id
      JOIN research_runs rr ON rr.id = r.research_run_id
      LEFT JOIN source_documents sd ON sd.source_id = r.source_id
      LEFT JOIN manual_source_imports mi ON mi.source_id = r.source_id
      WHERE r.position = 1
      ORDER BY CASE WHEN r.decision = 'rejected' THEN 0 ELSE 1 END,
        s.last_checked_at DESC LIMIT ?
    `).bind(Math.min(Math.max(limit, 1), 100)).all<QueueRow>();
    return result.results.map(toQueueItem);
  }
}

export { revalidationIntervalDays };
