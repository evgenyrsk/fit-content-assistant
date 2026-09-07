import type { D1Database } from '@cloudflare/workers-types';
import type { SourceIntegrityMaintenanceResult, SourceIntegrityMaintenanceStore } from '../../application/ports/source-integrity-maintenance-store.ts';
import type { EvidenceRecordStatus } from '../../domain/index.ts';

interface CountRow { count: number }

export class D1SourceIntegrityMaintenanceStore implements SourceIntegrityMaintenanceStore {
  constructor(private readonly database: D1Database) {}

  async blockDependents(sourceId: string, _recordStatus: EvidenceRecordStatus, now: string): Promise<SourceIntegrityMaintenanceResult> {
    const affectedClaims = await this.database.prepare(`
      SELECT DISTINCT ce.claim_version_id AS id
      FROM claim_evidence ce JOIN source_chunks sc ON sc.id = ce.source_chunk_id
      JOIN claim_versions cv ON cv.id = ce.claim_version_id
      WHERE sc.source_id = ? AND cv.status = 'approved'
    `).bind(sourceId).all<{ id: string }>();
    const claimIds = affectedClaims.results.map((row) => row.id);
    if (claimIds.length === 0) return { blockedClaims: 0, blockedContent: 0 };
    const placeholders = claimIds.map(() => '?').join(',');
    const content = await this.database.prepare(`
      SELECT COUNT(DISTINCT ci.id) AS count
      FROM content_items ci JOIN content_fragments cf ON cf.content_item_id = ci.id
      JOIN content_claims cc ON cc.content_fragment_id = cf.id
      JOIN content_operations co ON co.content_item_id = ci.id
      WHERE cc.claim_version_id IN (${placeholders}) AND co.editorial_status IN ('ready', 'scheduled')
    `).bind(...claimIds).first<CountRow>();
    await this.database.batch([
      this.database.prepare(`UPDATE claim_versions SET status = 'needs_review', reviewed_at = NULL WHERE id IN (${placeholders})`)
        .bind(...claimIds),
      this.database.prepare(`UPDATE content_items SET status = 'needs_review', updated_at = ? WHERE id IN (
        SELECT DISTINCT ci.id FROM content_items ci JOIN content_fragments cf ON cf.content_item_id = ci.id
        JOIN content_claims cc ON cc.content_fragment_id = cf.id JOIN content_operations co ON co.content_item_id = ci.id
        WHERE cc.claim_version_id IN (${placeholders}) AND co.editorial_status IN ('ready', 'scheduled')
      )`).bind(now, ...claimIds),
      this.database.prepare(`UPDATE content_operations SET editorial_status = 'fact_check', scheduled_for = NULL, updated_at = ?
        WHERE content_item_id IN (
          SELECT DISTINCT cf.content_item_id FROM content_fragments cf JOIN content_claims cc ON cc.content_fragment_id = cf.id
          WHERE cc.claim_version_id IN (${placeholders})
        ) AND editorial_status IN ('ready', 'scheduled')`).bind(now, ...claimIds),
    ]);
    return { blockedClaims: claimIds.length, blockedContent: Number(content?.count ?? 0) };
  }
}
