PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_documents (
  source_id TEXT PRIMARY KEY REFERENCES sources(id),
  source_provider TEXT NOT NULL,
  content_level TEXT NOT NULL,
  pmcid TEXT,
  reuse_status TEXT NOT NULL DEFAULT 'unknown',
  license TEXT,
  reuse_origin TEXT,
  fetched_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_documents_pmcid
ON source_documents(pmcid) WHERE pmcid IS NOT NULL;

PRAGMA optimize;
