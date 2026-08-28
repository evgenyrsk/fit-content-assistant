PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_content_items_status_updated
ON content_items(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_claims_claim
ON content_claims(claim_version_id);

PRAGMA optimize;
