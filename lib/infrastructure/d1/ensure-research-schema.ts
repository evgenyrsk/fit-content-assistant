import type { D1Database } from '@cloudflare/workers-types';

const researchSchema = [
  `CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY, doi TEXT, pmid TEXT, url TEXT NOT NULL, title TEXT NOT NULL,
    source_type TEXT NOT NULL, publication_date TEXT, record_status TEXT NOT NULL DEFAULT 'unknown',
    fingerprint TEXT NOT NULL UNIQUE, raw_metadata_json TEXT NOT NULL,
    discovered_at TEXT NOT NULL, last_checked_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS research_runs (
    id TEXT PRIMARY KEY, query TEXT NOT NULL, mode TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('working', 'needs_review', 'complete', 'failed')),
    search_plan_json TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS research_run_sources (
    research_run_id TEXT NOT NULL REFERENCES research_runs(id),
    source_id TEXT NOT NULL REFERENCES sources(id), provider TEXT NOT NULL,
    rank INTEGER NOT NULL, disposition TEXT NOT NULL DEFAULT 'candidate',
    PRIMARY KEY (research_run_id, source_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_research_run_sources_rank
  ON research_run_sources(research_run_id, rank)`,
] as const;

export async function ensureResearchSchema(database: D1Database): Promise<void> {
  await database.batch(researchSchema.map((statement) => database.prepare(statement)));
}
