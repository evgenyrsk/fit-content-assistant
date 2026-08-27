PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES topics(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_edges (
  from_topic_id TEXT NOT NULL REFERENCES topics(id),
  to_topic_id TEXT NOT NULL REFERENCES topics(id),
  relation TEXT NOT NULL CHECK (relation IN ('broader', 'narrower', 'related')),
  PRIMARY KEY (from_topic_id, to_topic_id, relation)
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  doi TEXT,
  pmid TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  publication_date TEXT,
  record_status TEXT NOT NULL DEFAULT 'unknown',
  fingerprint TEXT NOT NULL UNIQUE,
  raw_metadata_json TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  last_checked_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_doi
ON sources(doi) WHERE doi IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_pmid
ON sources(pmid) WHERE pmid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sources_publication_date
ON sources(publication_date DESC);

CREATE TABLE IF NOT EXISTS source_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  chunk_kind TEXT NOT NULL,
  locator TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (source_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_source_chunks_source
ON source_chunks(source_id);

CREATE TABLE IF NOT EXISTS research_runs (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('working', 'needs_review', 'complete', 'failed')),
  search_plan_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_runs_started
ON research_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS research_run_sources (
  research_run_id TEXT NOT NULL REFERENCES research_runs(id),
  source_id TEXT NOT NULL REFERENCES sources(id),
  provider TEXT NOT NULL,
  rank INTEGER NOT NULL,
  disposition TEXT NOT NULL DEFAULT 'candidate',
  PRIMARY KEY (research_run_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_research_run_sources_rank
ON research_run_sources(research_run_id, rank);

CREATE TABLE IF NOT EXISTS source_assessments (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  result_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  study_design TEXT NOT NULL,
  instrument TEXT NOT NULL,
  decision TEXT NOT NULL,
  reasons_json TEXT NOT NULL,
  methodology_version TEXT NOT NULL,
  assessor TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_assessments_source
ON source_assessments(source_id, created_at DESC);

CREATE TABLE IF NOT EXISTS study_dimension_assessments (
  id TEXT PRIMARY KEY,
  source_assessment_id TEXT NOT NULL REFERENCES source_assessments(id),
  dimension TEXT NOT NULL,
  judgement TEXT NOT NULL,
  rationale TEXT NOT NULL,
  provenance_ids_json TEXT NOT NULL,
  assessor TEXT NOT NULL,
  UNIQUE (source_assessment_id, dimension)
);

CREATE TABLE IF NOT EXISTS body_assessments (
  id TEXT PRIMARY KEY,
  research_run_id TEXT NOT NULL REFERENCES research_runs(id),
  outcome_id TEXT NOT NULL,
  initial_certainty TEXT NOT NULL,
  proposed_certainty TEXT NOT NULL,
  domains_json TEXT NOT NULL,
  rationale TEXT NOT NULL,
  human_review TEXT NOT NULL,
  methodology_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_body_assessments_run
ON body_assessments(research_run_id, outcome_id);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  topic_id TEXT REFERENCES topics(id),
  stable_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claim_versions (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id),
  version INTEGER NOT NULL,
  statement TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  confidence TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  status TEXT NOT NULL,
  methodology_version TEXT NOT NULL,
  reviewed_at TEXT,
  review_due_at TEXT NOT NULL,
  supersedes_id TEXT REFERENCES claim_versions(id),
  created_at TEXT NOT NULL,
  UNIQUE (claim_id, version)
);

CREATE INDEX IF NOT EXISTS idx_claim_versions_retrieval
ON claim_versions(status, confidence, review_due_at);

CREATE TABLE IF NOT EXISTS claim_evidence (
  claim_version_id TEXT NOT NULL REFERENCES claim_versions(id),
  source_chunk_id TEXT NOT NULL REFERENCES source_chunks(id),
  source_assessment_id TEXT REFERENCES source_assessments(id),
  direction TEXT NOT NULL,
  weight TEXT NOT NULL,
  PRIMARY KEY (claim_version_id, source_chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_claim_evidence_source
ON claim_evidence(source_chunk_id);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  format TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  style_profile_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_items_updated
ON content_items(updated_at DESC);

CREATE TABLE IF NOT EXISTS content_fragments (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL REFERENCES content_items(id),
  position INTEGER NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  UNIQUE (content_item_id, position)
);

CREATE TABLE IF NOT EXISTS content_claims (
  content_fragment_id TEXT NOT NULL REFERENCES content_fragments(id),
  claim_version_id TEXT NOT NULL REFERENCES claim_versions(id),
  PRIMARY KEY (content_fragment_id, claim_version_id)
);

CREATE TABLE IF NOT EXISTS model_runs (
  id TEXT PRIMARY KEY,
  research_run_id TEXT REFERENCES research_runs(id),
  content_item_id TEXT REFERENCES content_items(id),
  stage TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  routed_provider TEXT,
  prompt_version TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  tool_calls_json TEXT NOT NULL,
  retrieved_ids_json TEXT NOT NULL,
  decision TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_model_runs_stage_started
ON model_runs(stage, started_at DESC);

CREATE TABLE IF NOT EXISTS trend_signals (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  url TEXT,
  observed_at TEXT NOT NULL,
  freshness_minutes INTEGER NOT NULL,
  growth_signal TEXT NOT NULL,
  audience_fit REAL NOT NULL,
  scientific_researchability REAL NOT NULL,
  saturation_risk REAL NOT NULL,
  raw_metrics_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_trend_signals_freshness
ON trend_signals(source, observed_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_aggregate
ON audit_events(aggregate_type, aggregate_id, occurred_at DESC);

PRAGMA optimize;
