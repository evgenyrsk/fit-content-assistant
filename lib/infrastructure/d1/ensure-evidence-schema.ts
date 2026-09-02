import type { D1Database } from '@cloudflare/workers-types';

const evidenceSchema = [
  `CREATE TABLE IF NOT EXISTS source_chunks (
    id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id),
    chunk_kind TEXT NOT NULL, locator TEXT NOT NULL, content TEXT NOT NULL,
    content_hash TEXT NOT NULL, embedding_id TEXT, created_at TEXT NOT NULL,
    UNIQUE (source_id, content_hash)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_source_chunks_source ON source_chunks(source_id)`,
  `CREATE TABLE IF NOT EXISTS source_documents (
    source_id TEXT PRIMARY KEY REFERENCES sources(id), source_provider TEXT NOT NULL,
    content_level TEXT NOT NULL, pmcid TEXT, reuse_status TEXT NOT NULL DEFAULT 'unknown',
    license TEXT, reuse_origin TEXT, fetched_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_source_documents_pmcid
  ON source_documents(pmcid) WHERE pmcid IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS manual_source_imports (
    id TEXT PRIMARY KEY, source_id TEXT NOT NULL UNIQUE REFERENCES sources(id),
    object_key TEXT NOT NULL UNIQUE, original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL, byte_size INTEGER NOT NULL,
    content_sha256 TEXT NOT NULL UNIQUE, page_count INTEGER NOT NULL,
    extracted_characters INTEGER NOT NULL, rights_basis TEXT NOT NULL,
    rights_attested_at TEXT NOT NULL, uploaded_at TEXT NOT NULL,
    processing_status TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_manual_source_imports_status_uploaded
  ON manual_source_imports(processing_status, uploaded_at DESC)`,
  `CREATE TABLE IF NOT EXISTS source_intake_decisions (
    research_run_id TEXT NOT NULL REFERENCES research_runs(id),
    source_id TEXT NOT NULL REFERENCES sources(id), decision TEXT NOT NULL,
    reasons_json TEXT NOT NULL, policy_version TEXT NOT NULL, record_status TEXT NOT NULL,
    content_level TEXT NOT NULL, publication_types_json TEXT NOT NULL,
    abstract_characters INTEGER NOT NULL, evaluated_at TEXT NOT NULL,
    PRIMARY KEY (research_run_id, source_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_source_intake_decisions_decision
  ON source_intake_decisions(research_run_id, decision)`,
  `CREATE TABLE IF NOT EXISTS source_review_decisions (
    id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id),
    decision TEXT NOT NULL CHECK (decision IN ('included', 'excluded', 'needs_follow_up')),
    reason TEXT NOT NULL, reviewer_id TEXT NOT NULL, overrides_intake INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_source_review_decisions_source_created
  ON source_review_decisions(source_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS source_assessments (
    id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), result_id TEXT NOT NULL,
    question_type TEXT NOT NULL, study_design TEXT NOT NULL, instrument TEXT NOT NULL,
    decision TEXT NOT NULL, reasons_json TEXT NOT NULL, methodology_version TEXT NOT NULL,
    assessor TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_source_assessments_source
  ON source_assessments(source_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS source_assessment_human_reviews (
    id TEXT PRIMARY KEY, source_assessment_id TEXT NOT NULL REFERENCES source_assessments(id),
    decision TEXT NOT NULL CHECK (decision IN ('confirmed', 'rejected', 'needs_more_information')),
    finding_checked INTEGER NOT NULL, provenance_checked INTEGER NOT NULL,
    scope_checked INTEGER NOT NULL, reason TEXT NOT NULL, reviewer_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_source_assessment_reviews_assessment_created
  ON source_assessment_human_reviews(source_assessment_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS research_run_assessments (
    research_run_id TEXT NOT NULL REFERENCES research_runs(id),
    source_assessment_id TEXT NOT NULL REFERENCES source_assessments(id),
    PRIMARY KEY (research_run_id, source_assessment_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_research_run_assessments_run
  ON research_run_assessments(research_run_id)`,
  `CREATE TABLE IF NOT EXISTS source_assessment_findings (
    source_assessment_id TEXT PRIMARY KEY REFERENCES source_assessments(id),
    direction TEXT NOT NULL, effect_estimate TEXT NOT NULL,
    statistical_uncertainty TEXT NOT NULL, practical_significance TEXT NOT NULL,
    provenance_ids_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS study_dimension_assessments (
    id TEXT PRIMARY KEY, source_assessment_id TEXT NOT NULL REFERENCES source_assessments(id),
    dimension TEXT NOT NULL, judgement TEXT NOT NULL, rationale TEXT NOT NULL,
    provenance_ids_json TEXT NOT NULL, assessor TEXT NOT NULL,
    UNIQUE (source_assessment_id, dimension)
  )`,
  `CREATE TABLE IF NOT EXISTS study_integrity_checks (
    id TEXT PRIMARY KEY, source_assessment_id TEXT NOT NULL REFERENCES source_assessments(id),
    check_id TEXT NOT NULL, state TEXT NOT NULL, rationale TEXT NOT NULL,
    provenance_ids_json TEXT NOT NULL, assessor TEXT NOT NULL,
    UNIQUE (source_assessment_id, check_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_study_integrity_checks_assessment
  ON study_integrity_checks(source_assessment_id)`,
  `CREATE TABLE IF NOT EXISTS body_assessments (
    id TEXT PRIMARY KEY, research_run_id TEXT NOT NULL REFERENCES research_runs(id),
    outcome_id TEXT NOT NULL, initial_certainty TEXT NOT NULL, proposed_certainty TEXT NOT NULL,
    domains_json TEXT NOT NULL, rationale TEXT NOT NULL, human_review TEXT NOT NULL,
    methodology_version TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_body_assessments_run
  ON body_assessments(research_run_id, outcome_id)`,
  `CREATE TABLE IF NOT EXISTS body_assessment_human_reviews (
    id TEXT PRIMARY KEY, body_assessment_id TEXT NOT NULL REFERENCES body_assessments(id),
    decision TEXT NOT NULL CHECK (decision IN ('confirmed', 'rejected', 'needs_more_information')),
    evidence_set_checked INTEGER NOT NULL, contradictions_checked INTEGER NOT NULL,
    certainty_checked INTEGER NOT NULL, scope_checked INTEGER NOT NULL,
    reason TEXT NOT NULL, reviewer_id TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_body_assessment_reviews_assessment_created
  ON body_assessment_human_reviews(body_assessment_id, created_at DESC)`,
] as const;

export async function ensureEvidenceSchema(database: D1Database): Promise<void> {
  await database.batch(evidenceSchema.map((statement) => database.prepare(statement)));
}
