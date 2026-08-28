PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS content_operations (
  content_item_id TEXT PRIMARY KEY REFERENCES content_items(id),
  editorial_status TEXT NOT NULL CHECK (
    editorial_status IN ('draft', 'fact_check', 'ready', 'scheduled', 'published', 'archived')
  ),
  scheduled_for TEXT,
  published_at TEXT,
  publication_url TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_operations_schedule
ON content_operations(editorial_status, scheduled_for);

CREATE TABLE IF NOT EXISTS content_item_versions (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL REFERENCES content_items(id),
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  fragments_json TEXT NOT NULL,
  change_note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (content_item_id, version)
);

CREATE TABLE IF NOT EXISTS content_human_reviews (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL REFERENCES content_items(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  trace_checked INTEGER NOT NULL CHECK (trace_checked IN (0, 1)),
  caveats_checked INTEGER NOT NULL CHECK (caveats_checked IN (0, 1)),
  platform_fit_checked INTEGER NOT NULL CHECK (platform_fit_checked IN (0, 1)),
  notes TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_human_reviews_item
ON content_human_reviews(content_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS topic_ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  angle TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('manual', 'knowledge_gap', 'contradiction', 'trend')),
  scientific_readiness TEXT NOT NULL CHECK (scientific_readiness IN ('supported', 'research_needed', 'blocked')),
  target_format TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'selected', 'dismissed')),
  linked_claim_ids_json TEXT NOT NULL,
  linked_signal_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_ideas_status_updated
ON topic_ideas(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS user_notes (
  id TEXT PRIMARY KEY,
  note_kind TEXT NOT NULL CHECK (note_kind IN ('personal_experience', 'observation', 'idea')),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  evidence_use TEXT NOT NULL CHECK (evidence_use = 'narrative_only'),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_notes_created
ON user_notes(created_at DESC);

CREATE TABLE IF NOT EXISTS publication_metrics (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL REFERENCES content_items(id),
  platform TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  views INTEGER NOT NULL,
  likes INTEGER NOT NULL,
  comments INTEGER NOT NULL,
  saves INTEGER NOT NULL,
  shares INTEGER NOT NULL,
  watch_time_seconds REAL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'csv')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publication_metrics_item_recorded
ON publication_metrics(content_item_id, recorded_at DESC);

PRAGMA optimize;
