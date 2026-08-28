import type { D1Database } from '@cloudflare/workers-types';
import type { ManualClaimReviewStore } from '../../application/ports/manual-claim-review-store.ts';
import type { ManualClaimReviewRecord } from '../../domain/index.ts';

export class D1ManualClaimReviewStore implements ManualClaimReviewStore {
  constructor(private readonly database: D1Database) {}

  async save(record: ManualClaimReviewRecord): Promise<void> {
    await this.database.batch([
      this.database.prepare(`
        UPDATE claim_versions SET status = ?, reviewed_at = ?
        WHERE id = ? AND status = 'needs_review'
      `).bind(record.decision, record.createdAt, record.claimVersionId),
      this.database.prepare(`
        INSERT INTO claim_manual_reviews (
          id, claim_version_id, decision, reason, contradictory_evidence_note,
          provenance_checked, scope_checked, contradictions_checked, reviewer_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        record.id, record.claimVersionId, record.decision, record.reason,
        record.contradictoryEvidenceNote, Number(record.provenanceChecked),
        Number(record.scopeChecked), Number(record.contradictionsChecked),
        record.reviewerId, record.createdAt,
      ),
    ]);
  }
}
