import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { ManualSourceImportRepository } from '../../application/ports/manual-source-import-repository.ts';
import type { ManualPdfImportReceipt, ManualPdfImportRecord } from '../../domain/index.ts';

interface ImportRow {
  id: string;
  source_id: string;
  title: string;
  original_filename: string;
  page_count: number;
  extracted_characters: number;
  processing_status: ManualPdfImportReceipt['processingStatus'];
}

async function contentHash(content: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sourceStatement(database: D1Database, record: ManualPdfImportRecord): D1PreparedStatement {
  const document = record.document;
  const safeMetadata = {
    provider: document.provider, externalId: document.externalId, originalFilename: record.originalFilename,
    pageCount: record.pageCount, extractedCharacters: record.extractedCharacters,
    rightsBasis: record.rightsBasis, processingStatus: record.processingStatus,
  };
  return database.prepare(`
    INSERT INTO sources (
      id, doi, pmid, url, title, source_type, publication_date, record_status,
      fingerprint, raw_metadata_json, discovered_at, last_checked_at
    ) VALUES (?, ?, ?, ?, ?, 'user supplied PDF', NULL, 'unknown', ?, ?, ?, ?)
  `).bind(
    record.sourceId, document.doi ?? null, document.pmid ?? null,
    `/api/research/sources/pdf?sourceId=${encodeURIComponent(record.sourceId)}`,
    document.title, record.sourceId, JSON.stringify(safeMetadata), record.uploadedAt, record.uploadedAt,
  );
}

function runStatements(database: D1Database, record: ManualPdfImportRecord): D1PreparedStatement[] {
  return [
    database.prepare(`
      INSERT INTO research_runs (
        id, query, mode, status, search_plan_json, started_at, completed_at
      ) VALUES (?, ?, 'manual_import', 'needs_review', ?, ?, ?)
    `).bind(
      record.researchRunId, `Ручной импорт PDF: ${record.document.title}`,
      JSON.stringify({ source: 'manual_pdf', rightsBasis: record.rightsBasis }),
      record.uploadedAt, record.uploadedAt,
    ),
    database.prepare(`
      INSERT INTO research_run_sources (
        research_run_id, source_id, provider, rank, disposition
      ) VALUES (?, ?, 'manual_pdf', 1, ?)
    `).bind(record.researchRunId, record.sourceId, record.intakeDecision.decision),
  ];
}

function documentStatement(database: D1Database, record: ManualPdfImportRecord): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO source_documents (
      source_id, source_provider, content_level, pmcid, reuse_status,
      license, reuse_origin, fetched_at
    ) VALUES (?, 'manual_pdf', ?, NULL, 'user_attested', ?, 'user_authorized_upload', ?)
  `).bind(record.sourceId, record.document.contentLevel, record.rightsBasis, record.uploadedAt);
}

async function chunkStatements(database: D1Database, record: ManualPdfImportRecord): Promise<D1PreparedStatement[]> {
  return Promise.all(record.document.chunks.map(async (chunk) => database.prepare(`
    INSERT INTO source_chunks (
      id, source_id, chunk_kind, locator, content, content_hash, embedding_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(source_id, content_hash) DO NOTHING
  `).bind(
    chunk.id, record.sourceId, chunk.kind, chunk.locator, chunk.text,
    await contentHash(chunk.text), record.uploadedAt,
  )));
}

function intakeStatement(database: D1Database, record: ManualPdfImportRecord): D1PreparedStatement {
  const decision = record.intakeDecision;
  return database.prepare(`
    INSERT INTO source_intake_decisions (
      research_run_id, source_id, decision, reasons_json, policy_version,
      record_status, content_level, publication_types_json, abstract_characters, evaluated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.researchRunId, record.sourceId, decision.decision, JSON.stringify(decision.reasons),
    decision.policyVersion, decision.recordStatus, decision.contentLevel,
    JSON.stringify(decision.publicationTypes), decision.abstractCharacters, decision.evaluatedAt,
  );
}

function importStatement(database: D1Database, record: ManualPdfImportRecord): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO manual_source_imports (
      id, source_id, object_key, original_filename, content_type, byte_size,
      content_sha256, page_count, extracted_characters, rights_basis,
      rights_attested_at, uploaded_at, processing_status
    ) VALUES (?, ?, ?, ?, 'application/pdf', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.id, record.sourceId, record.objectKey, record.originalFilename, record.byteSize,
    record.contentSha256, record.pageCount, record.extractedCharacters, record.rightsBasis,
    record.rightsAttestedAt, record.uploadedAt, record.processingStatus,
  );
}

function auditStatement(database: D1Database, record: ManualPdfImportRecord): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO audit_events (
      id, aggregate_type, aggregate_id, event_type, actor_type, payload_json, occurred_at
    ) VALUES (?, 'research_run', ?, 'manual_pdf_imported', 'human', ?, ?)
  `).bind(
    crypto.randomUUID(), record.researchRunId,
    JSON.stringify({
      sourceId: record.sourceId, importId: record.id, contentSha256: record.contentSha256,
      rightsBasis: record.rightsBasis, pageCount: record.pageCount,
      extractedCharacters: record.extractedCharacters, processingStatus: record.processingStatus,
    }),
    record.uploadedAt,
  );
}

export class D1ManualSourceImportRepository implements ManualSourceImportRepository {
  constructor(private readonly database: D1Database) {}

  async findByContentHash(contentSha256: string): Promise<ManualPdfImportReceipt | null> {
    const row = await this.database.prepare(`
      SELECT m.id, m.source_id, s.title, m.original_filename, m.page_count,
        m.extracted_characters, m.processing_status
      FROM manual_source_imports m JOIN sources s ON s.id = m.source_id
      WHERE m.content_sha256 = ?
    `).bind(contentSha256).first<ImportRow>();
    if (!row) return null;
    return {
      importId: row.id, sourceId: row.source_id, title: row.title,
      fileName: row.original_filename, pageCount: row.page_count,
      extractedCharacters: row.extracted_characters, processingStatus: row.processing_status,
      duplicate: true,
    };
  }

  async save(record: ManualPdfImportRecord): Promise<void> {
    const statements = [
      sourceStatement(this.database, record),
      ...runStatements(this.database, record),
      documentStatement(this.database, record),
      ...await chunkStatements(this.database, record),
      intakeStatement(this.database, record),
      importStatement(this.database, record),
      auditStatement(this.database, record),
    ];
    await this.database.batch(statements);
  }
}
