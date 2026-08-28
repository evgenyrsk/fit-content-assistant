import type { D1Database } from '@cloudflare/workers-types';

const contentSchema = [
  `CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY, format TEXT NOT NULL, title TEXT NOT NULL,
    status TEXT NOT NULL, style_profile_version TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_items_status_updated
  ON content_items(status, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS content_fragments (
    id TEXT PRIMARY KEY, content_item_id TEXT NOT NULL REFERENCES content_items(id),
    position INTEGER NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL,
    UNIQUE (content_item_id, position)
  )`,
  `CREATE TABLE IF NOT EXISTS content_claims (
    content_fragment_id TEXT NOT NULL REFERENCES content_fragments(id),
    claim_version_id TEXT NOT NULL REFERENCES claim_versions(id),
    PRIMARY KEY (content_fragment_id, claim_version_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_claims_claim
  ON content_claims(claim_version_id)`,
] as const;

export async function ensureContentSchema(database: D1Database): Promise<void> {
  await database.batch(contentSchema.map((statement) => database.prepare(statement)));
}
