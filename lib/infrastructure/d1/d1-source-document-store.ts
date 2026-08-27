import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { SourceDocumentStore } from '../../application/ports/source-document-store.ts';
import type {
  ScientificSourceDocument,
  ScientificSourceProvider,
  SourceContentLevel,
  SourceDocumentChunk,
} from '../../domain/index.ts';

interface SourceRow {
  id: string;
  title: string;
  doi: string | null;
  pmid: string | null;
  source_type: string;
  record_status: ScientificSourceDocument['recordStatus'];
  last_checked_at: string;
}

interface ChunkRow {
  id: string;
  source_id: string;
  chunk_kind: SourceDocumentChunk['kind'];
  locator: string;
  content: string;
}

interface DocumentRow {
  source_provider: ScientificSourceProvider;
  content_level: SourceContentLevel;
  pmcid: string | null;
  reuse_status: 'permitted' | 'user_attested' | 'unknown';
  license: string | null;
  reuse_origin: 'pmc_open_access' | 'user_authorized_upload' | null;
  fetched_at: string;
}

async function contentHash(content: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function chunkInsert(database: D1Database, chunk: SourceDocumentChunk, createdAt: string): Promise<D1PreparedStatement> {
  const hash = await contentHash(chunk.text);
  return database.prepare(`
    INSERT INTO source_chunks (
      id, source_id, chunk_kind, locator, content, content_hash, embedding_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(source_id, content_hash) DO NOTHING
  `).bind(`${chunk.sourceId}:${hash.slice(0, 24)}`, chunk.sourceId, chunk.kind, chunk.locator, chunk.text, hash, createdAt);
}

function sourceInsert(database: D1Database, document: ScientificSourceDocument): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO sources (
      id, doi, pmid, url, title, source_type, publication_date, record_status,
      fingerprint, raw_metadata_json, discovered_at, last_checked_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET record_status = CASE
        WHEN sources.record_status IN ('retracted', 'expression_of_concern', 'corrected')
          AND excluded.record_status = 'active' THEN sources.record_status
        ELSE excluded.record_status END,
      last_checked_at = excluded.last_checked_at
  `).bind(
    document.sourceId, document.doi ?? null, document.pmid ?? null,
    sourceUrl(document), document.title,
    document.publicationTypes.join(', ') || 'journal article', document.recordStatus,
    document.sourceId, JSON.stringify(document), document.fetchedAt, document.fetchedAt,
  );
}

function sourceUrl(document: ScientificSourceDocument): string {
  if (document.provider === 'manual_pdf') {
    return `/api/research/sources/pdf?sourceId=${encodeURIComponent(document.sourceId)}`;
  }
  return `https://pubmed.ncbi.nlm.nih.gov/${document.pmid ?? document.externalId}/`;
}

function documentInsert(database: D1Database, document: ScientificSourceDocument): D1PreparedStatement {
  const rights = document.reuseRights;
  return database.prepare(`
    INSERT INTO source_documents (
      source_id, source_provider, content_level, pmcid, reuse_status,
      license, reuse_origin, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_id) DO UPDATE SET
      source_provider = CASE WHEN excluded.content_level = 'full_text'
        THEN excluded.source_provider ELSE source_documents.source_provider END,
      content_level = CASE WHEN source_documents.content_level = 'full_text'
        THEN source_documents.content_level ELSE excluded.content_level END,
      pmcid = COALESCE(excluded.pmcid, source_documents.pmcid),
      reuse_status = CASE WHEN excluded.reuse_status = 'permitted'
        THEN excluded.reuse_status ELSE source_documents.reuse_status END,
      license = COALESCE(excluded.license, source_documents.license),
      reuse_origin = COALESCE(excluded.reuse_origin, source_documents.reuse_origin),
      fetched_at = excluded.fetched_at
  `).bind(
    document.sourceId, document.provider, document.contentLevel, document.pmcid ?? null,
    rights ? rights.status : 'unknown', rights ? rights.license : null,
    rights ? rights.origin : null, document.fetchedAt,
  );
}

function reuseRights(metadata: DocumentRow | null) {
  if (!metadata || metadata.reuse_status === 'unknown') return undefined;
  if (!metadata.license || !metadata.reuse_origin) return undefined;
  return { status: metadata.reuse_status, license: metadata.license, origin: metadata.reuse_origin };
}

function contentLevel(metadata: DocumentRow | null, chunks: SourceDocumentChunk[]): SourceContentLevel {
  if (metadata) return metadata.content_level;
  return chunks.length > 0 ? 'abstract_only' : 'metadata_only';
}

function toDocument(
  source: SourceRow,
  metadata: DocumentRow | null,
  chunks: SourceDocumentChunk[],
): ScientificSourceDocument {
  return {
    sourceId: source.id, provider: metadata ? metadata.source_provider : 'pubmed',
    externalId: metadata?.pmcid ?? source.pmid ?? source.id,
    title: source.title, doi: source.doi ?? undefined, pmid: source.pmid ?? undefined,
    pmcid: metadata?.pmcid ?? undefined,
    publicationTypes: source.source_type.split(',').map((value) => value.trim()).filter(Boolean),
    recordStatus: source.record_status, contentLevel: contentLevel(metadata, chunks), chunks,
    reuseRights: reuseRights(metadata), fetchedAt: metadata ? metadata.fetched_at : source.last_checked_at,
  };
}

export class D1SourceDocumentStore implements SourceDocumentStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async saveAll(documents: ScientificSourceDocument[]): Promise<void> {
    for (const document of documents) {
      const statements: D1PreparedStatement[] = [
        sourceInsert(this.database, document),
        documentInsert(this.database, document),
        ...await Promise.all(document.chunks.map((chunk) => chunkInsert(this.database, chunk, document.fetchedAt))),
      ];
      await this.database.batch(statements);
    }
  }

  async findById(sourceId: string): Promise<ScientificSourceDocument | null> {
    const source = await this.database.prepare(`
      SELECT id, title, doi, pmid, source_type, record_status, last_checked_at
      FROM sources WHERE id = ?
    `).bind(sourceId).first<SourceRow>();
    if (!source) return null;
    const metadata = await this.database.prepare(`
      SELECT source_provider, content_level, pmcid, reuse_status, license, reuse_origin, fetched_at
      FROM source_documents WHERE source_id = ?
    `).bind(sourceId).first<DocumentRow>();
    const result = await this.database.prepare(`
      SELECT id, source_id, chunk_kind, locator, content
      FROM source_chunks WHERE source_id = ? ORDER BY locator, id
    `).bind(sourceId).all<ChunkRow>();
    const chunks = result.results.map((row) => ({
      id: row.id, sourceId: row.source_id, kind: row.chunk_kind,
      locator: row.locator, text: row.content,
    }));
    return toDocument(source, metadata, chunks);
  }
}
