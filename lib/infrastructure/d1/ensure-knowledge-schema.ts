import type { D1Database } from '@cloudflare/workers-types';

const knowledgeSchema = [
  `CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY, parent_id TEXT REFERENCES topics(id),
    slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY, topic_id TEXT REFERENCES topics(id),
    stable_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS claim_versions (
    id TEXT PRIMARY KEY, claim_id TEXT NOT NULL REFERENCES claims(id), version INTEGER NOT NULL,
    statement TEXT NOT NULL, scope_json TEXT NOT NULL, confidence TEXT NOT NULL,
    limitations_json TEXT NOT NULL, status TEXT NOT NULL, methodology_version TEXT NOT NULL,
    reviewed_at TEXT, review_due_at TEXT NOT NULL, supersedes_id TEXT REFERENCES claim_versions(id),
    created_at TEXT NOT NULL, UNIQUE (claim_id, version)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_claim_versions_retrieval
  ON claim_versions(status, confidence, review_due_at)`,
  `CREATE TABLE IF NOT EXISTS claim_evidence (
    claim_version_id TEXT NOT NULL REFERENCES claim_versions(id),
    source_chunk_id TEXT NOT NULL REFERENCES source_chunks(id),
    source_assessment_id TEXT REFERENCES source_assessments(id),
    direction TEXT NOT NULL, weight TEXT NOT NULL,
    PRIMARY KEY (claim_version_id, source_chunk_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_claim_evidence_source ON claim_evidence(source_chunk_id)`,
] as const;

export async function ensureKnowledgeSchema(database: D1Database): Promise<void> {
  await database.batch(knowledgeSchema.map((statement) => database.prepare(statement)));
}
