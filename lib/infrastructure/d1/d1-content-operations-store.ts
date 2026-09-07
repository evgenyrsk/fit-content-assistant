import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { ContentOperationsStore } from '../../application/ports/content-operations-store.ts';
import {
  validateContentReview, validateEditorialTransition, validateManualContent,
  type ContentOperationInput, type ContentReviewInput, type EditorialStatus, type ManualContentInput,
} from '../../domain/index.ts';

interface ItemRow { id: string; status: 'ready_for_human_review' | 'needs_review'; format: ManualContentInput['format'] }
interface OperationRow {
  editorial_status: EditorialStatus; scheduled_for: string | null;
  published_at: string | null; publication_url: string | null;
}
interface CountRow { count: number }

function operationValues(input: ContentOperationInput, operation: OperationRow | null, now: string) {
  if (input.editorialStatus === 'scheduled') {
    return { scheduledFor: input.scheduledFor ?? null, publishedAt: null, publicationUrl: null };
  }
  if (input.editorialStatus === 'published') {
    return { scheduledFor: null, publishedAt: now, publicationUrl: input.publicationUrl?.trim() ?? null };
  }
  if (input.editorialStatus === 'archived' && operation?.published_at) {
    return {
      scheduledFor: operation.scheduled_for, publishedAt: operation.published_at,
      publicationUrl: operation.publication_url,
    };
  }
  return { scheduledFor: null, publishedAt: null, publicationUrl: null };
}

export class D1ContentOperationsStore implements ContentOperationsStore {
  constructor(private readonly database: D1Database) {}

  private async approvedClaims(ids: string[], now: string): Promise<boolean> {
    if (ids.length === 0) return true;
    const placeholders = ids.map(() => '?').join(',');
    const row = await this.database.prepare(`
      WITH latest AS (SELECT claim_id, MAX(version) AS version FROM claim_versions GROUP BY claim_id)
      SELECT COUNT(*) AS count FROM claim_versions cv
      JOIN latest l ON l.claim_id = cv.claim_id AND l.version = cv.version
      WHERE cv.id IN (${placeholders}) AND cv.status = 'approved' AND cv.review_due_at > ?
    `).bind(...ids, now).first<CountRow>();
    return Number(row?.count ?? 0) === new Set(ids).size;
  }

  async saveManual(input: ManualContentInput, now: string): Promise<{ id: string; version: number }> {
    const errors = validateManualContent(input);
    if (errors.length) throw new Error(errors.join(' '));
    if (!await this.approvedClaims(input.claimVersionIds, now)) {
      throw new Error('Один или несколько claims неактуальны, не утверждены или не являются последними версиями.');
    }
    return input.itemId ? this.updateManual(input, now) : this.createManual(input, now);
  }

  private async createManual(input: ManualContentInput, now: string) {
    const id = crypto.randomUUID();
    const fragmentId = `${id}:manual-1`;
    const statements: D1PreparedStatement[] = [
      this.database.prepare(`INSERT INTO content_items
        (id, format, title, status, style_profile_version, created_at, updated_at)
        VALUES (?, ?, ?, 'needs_review', 'manual@1', ?, ?)`)
        .bind(id, input.format, input.title.trim(), now, now),
      this.database.prepare(`INSERT INTO content_fragments
        (id, content_item_id, position, kind, text) VALUES (?, ?, 0, ?, ?)`)
        .bind(fragmentId, id, input.fragmentKind, input.text.trim()),
      this.database.prepare(`INSERT INTO content_operations
        (content_item_id, editorial_status, updated_at) VALUES (?, 'draft', ?)`)
        .bind(id, now),
      this.database.prepare(`INSERT INTO content_item_versions
        (id, content_item_id, version, title, fragments_json, change_note, created_at)
        VALUES (?, ?, 1, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), id, input.title.trim(), this.fragmentsJson(input), input.changeNote.trim() || 'Первая ручная версия', now),
      ...this.claimStatements(fragmentId, input.claimVersionIds),
    ];
    await this.database.batch(statements);
    return { id, version: 1 };
  }

  private async updateManual(input: ManualContentInput, now: string) {
    const item = await this.database.prepare('SELECT id, status, format FROM content_items WHERE id = ?')
      .bind(input.itemId).first<ItemRow>();
    if (!item) throw new Error('Материал не найден.');
    const operation = await this.database.prepare('SELECT editorial_status, scheduled_for, published_at, publication_url FROM content_operations WHERE content_item_id = ?')
      .bind(input.itemId).first<OperationRow>();
    if (operation?.editorial_status === 'published') throw new Error('Опубликованный материал нельзя переписать: создайте новую версию-копию.');
    const versionRow = await this.database.prepare('SELECT COALESCE(MAX(version), 0) AS count FROM content_item_versions WHERE content_item_id = ?')
      .bind(input.itemId).first<CountRow>();
    const version = Number(versionRow?.count ?? 0) + 1;
    const fragmentId = `${input.itemId}:manual-${version}`;
    const statements: D1PreparedStatement[] = [
      this.database.prepare('DELETE FROM content_claims WHERE content_fragment_id IN (SELECT id FROM content_fragments WHERE content_item_id = ?)').bind(input.itemId),
      this.database.prepare('DELETE FROM content_fragments WHERE content_item_id = ?').bind(input.itemId),
      this.database.prepare(`UPDATE content_items SET format = ?, title = ?, status = 'needs_review', updated_at = ? WHERE id = ?`)
        .bind(input.format, input.title.trim(), now, input.itemId),
      this.database.prepare(`INSERT INTO content_fragments
        (id, content_item_id, position, kind, text) VALUES (?, ?, 0, ?, ?)`)
        .bind(fragmentId, input.itemId, input.fragmentKind, input.text.trim()),
      this.database.prepare(`INSERT INTO content_item_versions
        (id, content_item_id, version, title, fragments_json, change_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), input.itemId, version, input.title.trim(), this.fragmentsJson(input), input.changeNote.trim() || 'Ручная редакция', now),
      this.database.prepare(`INSERT INTO content_operations (content_item_id, editorial_status, updated_at)
        VALUES (?, 'draft', ?) ON CONFLICT(content_item_id) DO UPDATE SET
        editorial_status = 'draft', scheduled_for = NULL, updated_at = excluded.updated_at`)
        .bind(input.itemId, now),
      ...this.claimStatements(fragmentId, input.claimVersionIds),
    ];
    await this.database.batch(statements);
    return { id: input.itemId!, version };
  }

  async review(input: ContentReviewInput, now: string): Promise<void> {
    const errors = validateContentReview(input);
    if (errors.length) throw new Error(errors.join(' '));
    if (input.decision === 'approved' && !await this.contentClaimsRemainEligible(input.contentItemId, now)) {
      throw new Error('Факт-чек заблокирован: factual fragment потерял свежую approved claim-трассировку.');
    }
    const gate = input.decision === 'approved' ? 'ready_for_human_review' : 'needs_review';
    const editorial = input.decision === 'approved' ? 'ready' : 'draft';
    await this.database.batch([
      this.database.prepare(`INSERT INTO content_human_reviews
        (id, content_item_id, decision, trace_checked, caveats_checked, platform_fit_checked, notes, reviewer_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'owner', ?)`)
        .bind(crypto.randomUUID(), input.contentItemId, input.decision, Number(input.traceChecked), Number(input.caveatsChecked), Number(input.platformFitChecked), input.notes.trim(), now),
      this.database.prepare('UPDATE content_items SET status = ?, updated_at = ? WHERE id = ?')
        .bind(gate, now, input.contentItemId),
      this.database.prepare(`INSERT INTO content_operations (content_item_id, editorial_status, updated_at)
        VALUES (?, ?, ?) ON CONFLICT(content_item_id) DO UPDATE SET
        editorial_status = excluded.editorial_status, scheduled_for = NULL, updated_at = excluded.updated_at`)
        .bind(input.contentItemId, editorial, now),
    ]);
  }

  async updateOperation(input: ContentOperationInput, now: string): Promise<void> {
    const item = await this.database.prepare('SELECT id, status, format FROM content_items WHERE id = ?')
      .bind(input.contentItemId).first<ItemRow>();
    if (!item) throw new Error('Материал не найден.');
    const operation = await this.database.prepare('SELECT editorial_status, scheduled_for, published_at, publication_url FROM content_operations WHERE content_item_id = ?')
      .bind(input.contentItemId).first<OperationRow>();
    const current = operation?.editorial_status ?? (item.status === 'ready_for_human_review' ? 'ready' : 'draft');
    const errors = validateEditorialTransition(current, input, item.status, new Date(now));
    if (errors.length) throw new Error(errors.join(' '));
    if (['ready', 'scheduled', 'published'].includes(input.editorialStatus)
      && !await this.contentClaimsRemainEligible(input.contentItemId, now)) {
      throw new Error('Переход заблокирован: factual fragment потерял свежую approved claim-трассировку.');
    }
    const values = operationValues(input, operation, now);
    await this.database.prepare(`INSERT INTO content_operations
      (content_item_id, editorial_status, scheduled_for, published_at, publication_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(content_item_id) DO UPDATE SET
      editorial_status = excluded.editorial_status, scheduled_for = excluded.scheduled_for,
      published_at = excluded.published_at, publication_url = excluded.publication_url,
      updated_at = excluded.updated_at`).bind(
      input.contentItemId, input.editorialStatus,
      values.scheduledFor, values.publishedAt, values.publicationUrl, now,
    ).run();
  }

  private claimStatements(fragmentId: string, ids: string[]): D1PreparedStatement[] {
    return [...new Set(ids)].map((id) => this.database.prepare(
      'INSERT INTO content_claims (content_fragment_id, claim_version_id) VALUES (?, ?)',
    ).bind(fragmentId, id));
  }

  private fragmentsJson(input: ManualContentInput): string {
    return JSON.stringify([{ kind: input.fragmentKind, text: input.text.trim(), claimVersionIds: input.claimVersionIds }]);
  }

  private async contentClaimsRemainEligible(contentItemId: string, now: string): Promise<boolean> {
    const row = await this.database.prepare(`
      SELECT COUNT(*) AS count FROM content_fragments cf
      WHERE cf.content_item_id = ? AND cf.kind = 'fact' AND (
        NOT EXISTS (SELECT 1 FROM content_claims linked WHERE linked.content_fragment_id = cf.id)
        OR EXISTS (
          SELECT 1 FROM content_claims cc JOIN claim_versions cv ON cv.id = cc.claim_version_id
          WHERE cc.content_fragment_id = cf.id AND (
            cv.status <> 'approved' OR cv.review_due_at <= ?
            OR cv.version <> (SELECT MAX(latest.version) FROM claim_versions latest WHERE latest.claim_id = cv.claim_id)
          )
        )
      )
    `).bind(contentItemId, now).first<CountRow>();
    return Number(row?.count ?? 0) === 0;
  }
}
