PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS claim_manual_reviews (
  id TEXT PRIMARY KEY,
  claim_version_id TEXT NOT NULL UNIQUE REFERENCES claim_versions(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason TEXT NOT NULL,
  contradictory_evidence_note TEXT NOT NULL,
  provenance_checked INTEGER NOT NULL CHECK (provenance_checked IN (0, 1)),
  scope_checked INTEGER NOT NULL CHECK (scope_checked IN (0, 1)),
  contradictions_checked INTEGER NOT NULL CHECK (contradictions_checked IN (0, 1)),
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_manual_reviews_created
ON claim_manual_reviews(created_at DESC);

PRAGMA optimize;
