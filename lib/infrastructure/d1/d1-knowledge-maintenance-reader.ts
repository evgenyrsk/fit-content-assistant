import type { D1Database } from '@cloudflare/workers-types';
import type { KnowledgeMaintenanceReader } from '../../application/ports/knowledge-maintenance-reader.ts';
import type { KnowledgeMaintenanceResult, MaintenanceAlert } from '../../domain/index.ts';

interface ClaimDueRow { id: string; statement: string; review_due_at: string }
interface SourceDueRow { id: string; title: string; last_checked_at: string }
interface ChangedRow { aggregate_id: string; occurred_at: string; payload_json: string }

function changedDetail(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return `${String(parsed.previousRecordStatus ?? 'unknown')} → ${String(parsed.recordStatus ?? 'unknown')}`;
  } catch { return 'Статус библиографической записи изменился.'; }
}

export class D1KnowledgeMaintenanceReader implements KnowledgeMaintenanceReader {
  constructor(private readonly database: D1Database) {}

  async inspect(now: string): Promise<KnowledgeMaintenanceResult> {
    const [claims, sources, changed] = await Promise.all([
      this.database.prepare(`
        WITH latest AS (SELECT claim_id, MAX(version) AS version FROM claim_versions GROUP BY claim_id)
        SELECT cv.id, cv.statement, cv.review_due_at FROM claim_versions cv
        JOIN latest l ON l.claim_id = cv.claim_id AND l.version = cv.version
        WHERE cv.status = 'approved' AND datetime(cv.review_due_at) <= datetime(?)
        ORDER BY cv.review_due_at ASC LIMIT 20
      `).bind(now).all<ClaimDueRow>(),
      this.database.prepare(`SELECT id, title, last_checked_at FROM sources
        WHERE pmid IS NOT NULL AND datetime(last_checked_at, '+30 days') <= datetime(?)
        ORDER BY last_checked_at ASC LIMIT 20`).bind(now).all<SourceDueRow>(),
      this.database.prepare(`SELECT aggregate_id, occurred_at, payload_json FROM audit_events
        WHERE event_type = 'source_integrity_status_changed' AND datetime(occurred_at, '+30 days') > datetime(?)
        ORDER BY occurred_at DESC LIMIT 20`).bind(now).all<ChangedRow>(),
    ]);
    const alerts: MaintenanceAlert[] = [
      ...claims.results.map((row): MaintenanceAlert => ({
        id: row.id, kind: 'claim_due', title: row.statement,
        detail: 'Claim просрочен и исключён из генерации до повторного review.', occurredAt: row.review_due_at,
      })),
      ...sources.results.map((row): MaintenanceAlert => ({
        id: row.id, kind: 'source_due', title: row.title,
        detail: 'PubMed-запись ждёт проверки corrections/retraction.', occurredAt: row.last_checked_at,
      })),
      ...changed.results.map((row): MaintenanceAlert => ({
        id: row.aggregate_id, kind: 'record_changed', title: 'Изменился статус источника',
        detail: changedDetail(row.payload_json), occurredAt: row.occurred_at,
      })),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 24);
    return {
      dueClaimCount: claims.results.length, dueSourceCount: sources.results.length,
      changedRecordCount: changed.results.length, alerts, checkedAt: now,
    };
  }
}
