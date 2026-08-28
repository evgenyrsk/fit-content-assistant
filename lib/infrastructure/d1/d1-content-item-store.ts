import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { ContentItemStore } from '../../application/ports/content-item-store.ts';
import type { ContentItemRecord } from '../../domain/index.ts';

export class D1ContentItemStore implements ContentItemStore {
  constructor(private readonly database: D1Database) {}

  async save(record: ContentItemRecord): Promise<void> {
    const statements: D1PreparedStatement[] = [this.database.prepare(`
      INSERT INTO content_items (
        id, format, title, status, style_profile_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.id, record.draft.format, record.draft.title, record.status,
      record.brief.styleProfileVersion, record.createdAt, record.createdAt,
    )];
    record.draft.fragments.forEach((fragment, position) => {
      const storedFragmentId = `${record.id}:${fragment.id}`;
      statements.push(this.database.prepare(`
        INSERT INTO content_fragments (id, content_item_id, position, kind, text)
        VALUES (?, ?, ?, ?, ?)
      `).bind(storedFragmentId, record.id, position, fragment.kind, fragment.text));
      statements.push(...fragment.claimVersionIds.map((claimVersionId) => this.database.prepare(`
        INSERT INTO content_claims (content_fragment_id, claim_version_id) VALUES (?, ?)
      `).bind(storedFragmentId, claimVersionId)));
    });
    await this.database.batch(statements);
  }
}
