import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { SourceDocumentStore } from '../../application/ports/source-document-store.ts';
import type { ScientificSourceDocument, SourceDocumentChunk } from '../../domain/index.ts';

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

export class D1SourceDocumentStore implements SourceDocumentStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async saveAll(documents: ScientificSourceDocument[]): Promise<void> {
    for (const document of documents) {
      const statements: D1PreparedStatement[] = [
        this.database.prepare(`
          INSERT INTO sources (
            id, doi, pmid, url, title, source_type, publication_date, record_status,
            fingerprint, raw_metadata_json, discovered_at, last_checked_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET record_status = excluded.record_status,
            last_checked_at = excluded.last_checked_at
        `).bind(
          document.sourceId, document.doi ?? null, document.pmid ?? null,
          `https://pubmed.ncbi.nlm.nih.gov/${document.externalId}/`, document.title,
          document.publicationTypes.join(', ') || 'journal article', document.recordStatus,
          document.sourceId, JSON.stringify(document), document.fetchedAt, document.fetchedAt,
        ),
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
    const result = await this.database.prepare(`
      SELECT id, source_id, chunk_kind, locator, content
      FROM source_chunks WHERE source_id = ? ORDER BY locator, id
    `).bind(sourceId).all<ChunkRow>();
    const chunks = result.results.map((row) => ({
      id: row.id, sourceId: row.source_id, kind: row.chunk_kind,
      locator: row.locator, text: row.content,
    }));
    return {
      sourceId: source.id, provider: 'pubmed', externalId: source.pmid ?? source.id,
      title: source.title, doi: source.doi ?? undefined, pmid: source.pmid ?? undefined,
      publicationTypes: source.source_type.split(',').map((value) => value.trim()).filter(Boolean),
      recordStatus: source.record_status,
      contentLevel: chunks.length > 0 ? 'abstract_only' : 'metadata_only',
      chunks, fetchedAt: source.last_checked_at,
    };
  }
}
