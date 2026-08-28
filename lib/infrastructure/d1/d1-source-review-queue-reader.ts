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
  review_id: string | null;
  review_decision: NonNullable<SourceReviewQueueItem['humanReview']>['decision'] | null;
  review_reason: string | null;
  reviewer_id: string | null;
  review_created_at: string | null;
  overrides_intake: number | null;
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
  const humanReview = row.review_id && row.review_decision && row.review_reason
    && row.reviewer_id && row.review_created_at ? {
      id: row.review_id, decision: row.review_decision, reason: row.review_reason,
      reviewerId: row.reviewer_id, createdAt: row.review_created_at,
      overridesIntake: row.overrides_intake === 1,
    } : undefined;
  return {
    sourceId: row.source_id, researchRunId: row.research_run_id, researchQuery: row.query,
    title: row.title, url: row.url, pmid: row.pmid ?? undefined, pmcid: row.pmcid ?? undefined,
    sourceType: row.source_type, recordStatus: row.record_status,
    contentLevel: row.content_level ?? 'metadata_only', license: row.license ?? undefined,
    manualUpload: manualUpload(row),
    intakeDecision: row.decision, intakeReasons: reasons(row.reasons_json),
    policyVersion: row.policy_version, humanReview, lastCheckedAt: row.last_checked_at,
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
      ), latest_review AS (
        SELECT srd.*, ROW_NUMBER() OVER (
          PARTITION BY srd.source_id ORDER BY srd.created_at DESC, srd.id DESC
        ) AS position
        FROM source_review_decisions srd
      )
      SELECT r.source_id, r.research_run_id, rr.query, s.title, s.url, s.pmid,
        sd.pmcid, s.source_type, s.record_status, sd.content_level, sd.license,
        mi.original_filename, mi.byte_size, mi.page_count, mi.extracted_characters,
        mi.rights_basis, mi.processing_status,
        r.decision, r.reasons_json, r.policy_version, s.last_checked_at,
        hr.id AS review_id, hr.decision AS review_decision, hr.reason AS review_reason,
        hr.reviewer_id, hr.created_at AS review_created_at, hr.overrides_intake
      FROM ranked r JOIN sources s ON s.id = r.source_id
      JOIN research_runs rr ON rr.id = r.research_run_id
      LEFT JOIN source_documents sd ON sd.source_id = r.source_id
      LEFT JOIN manual_source_imports mi ON mi.source_id = r.source_id
      LEFT JOIN latest_review hr ON hr.source_id = r.source_id AND hr.position = 1
      WHERE r.position = 1
      ORDER BY CASE WHEN r.decision = 'rejected' THEN 0 ELSE 1 END,
        s.last_checked_at DESC LIMIT ?
    `).bind(Math.min(Math.max(limit, 1), 100)).all<QueueRow>();
    return result.results.map(toQueueItem);
  }

  async listDuePubmed(limit: number, now: string) {
    const result = await this.database.prepare(`
      SELECT id AS source_id, pmid, record_status AS previous_record_status
      FROM sources
      WHERE pmid IS NOT NULL AND datetime(last_checked_at, '+${revalidationIntervalDays} days') <= datetime(?)
      ORDER BY last_checked_at ASC LIMIT ?
    `).bind(now, Math.min(Math.max(limit, 1), 25)).all<{
      source_id: string;
      pmid: string;
      previous_record_status: SourceReviewQueueItem['recordStatus'];
    }>();
    return result.results.map((row) => ({
      sourceId: row.source_id, pmid: row.pmid, previousRecordStatus: row.previous_record_status,
    }));
  }
}

export { revalidationIntervalDays };
