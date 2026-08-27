PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS manual_source_imports (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE REFERENCES sources(id),
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL UNIQUE,
  page_count INTEGER NOT NULL,
  extracted_characters INTEGER NOT NULL,
  rights_basis TEXT NOT NULL,
  rights_attested_at TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  processing_status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_manual_source_imports_status_uploaded
ON manual_source_imports(processing_status, uploaded_at DESC);

PRAGMA optimize;
