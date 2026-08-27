PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_intake_decisions (
  research_run_id TEXT NOT NULL REFERENCES research_runs(id),
  source_id TEXT NOT NULL REFERENCES sources(id),
  decision TEXT NOT NULL,
  reasons_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  record_status TEXT NOT NULL,
  content_level TEXT NOT NULL,
  publication_types_json TEXT NOT NULL,
  abstract_characters INTEGER NOT NULL,
  evaluated_at TEXT NOT NULL,
  PRIMARY KEY (research_run_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_source_intake_decisions_decision
ON source_intake_decisions(research_run_id, decision);

PRAGMA optimize;
