PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS study_integrity_checks (
  id TEXT PRIMARY KEY,
  source_assessment_id TEXT NOT NULL REFERENCES source_assessments(id),
  check_id TEXT NOT NULL,
  state TEXT NOT NULL,
  rationale TEXT NOT NULL,
  provenance_ids_json TEXT NOT NULL,
  assessor TEXT NOT NULL,
  UNIQUE (source_assessment_id, check_id)
);

CREATE INDEX IF NOT EXISTS idx_study_integrity_checks_assessment
ON study_integrity_checks(source_assessment_id);

CREATE TABLE IF NOT EXISTS research_run_assessments (
  research_run_id TEXT NOT NULL REFERENCES research_runs(id),
  source_assessment_id TEXT NOT NULL REFERENCES source_assessments(id),
  PRIMARY KEY (research_run_id, source_assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_research_run_assessments_run
ON research_run_assessments(research_run_id);

CREATE TABLE IF NOT EXISTS source_assessment_findings (
  source_assessment_id TEXT PRIMARY KEY REFERENCES source_assessments(id),
  direction TEXT NOT NULL,
  effect_estimate TEXT NOT NULL,
  statistical_uncertainty TEXT NOT NULL,
  practical_significance TEXT NOT NULL,
  provenance_ids_json TEXT NOT NULL
);

PRAGMA optimize;
