import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import type { ResearchSearchResult, ScientificSourceCandidate } from '../../domain/index.ts';
import type { ResearchRunStore } from '../../application/ports/research-run-store.ts';
import { resolveStoredSourceId } from './resolve-source-id.ts';

function fingerprint(source: ScientificSourceCandidate): string {
  if (source.provider === 'pubmed' && source.pmid) return `pmid:${source.pmid}`;
  if (source.doi) return `doi:${source.doi.toLowerCase()}`;
  if (source.pmid) return `pmid:${source.pmid}`;
  return `url:${source.url}`;
}

function sourceInsert(database: D1Database, source: ScientificSourceCandidate, storedId: string): D1PreparedStatement {
  const sourceFingerprint = fingerprint(source);
  return database.prepare(`
    INSERT INTO sources (
      id, doi, pmid, url, title, source_type, publication_date, record_status,
      fingerprint, raw_metadata_json, discovered_at, last_checked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unknown', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      doi = COALESCE(sources.doi, excluded.doi),
      pmid = COALESCE(sources.pmid, excluded.pmid),
      title = excluded.title,
      raw_metadata_json = excluded.raw_metadata_json,
      last_checked_at = excluded.last_checked_at
  `).bind(
    storedId, source.doi ?? null, source.pmid ?? null, source.url, source.title,
    source.sourceType, source.publishedAt ?? null, sourceFingerprint, JSON.stringify(source),
    source.discoveredAt, source.discoveredAt,
  );
}

export class D1ResearchRunStore implements ResearchRunStore {
  private readonly database: D1Database;

  constructor(database: D1Database) {
    this.database = database;
  }

  async saveSearch(result: ResearchSearchResult): Promise<void> {
    const storedIds = await Promise.all(result.candidates.map((source) => resolveStoredSourceId(this.database, {
      sourceId: fingerprint(source), pmid: source.pmid, doi: source.doi,
    })));
    const statements: D1PreparedStatement[] = [
      this.database.prepare(`
        INSERT INTO research_runs (
          id, query, mode, status, search_plan_json, started_at, completed_at
        ) VALUES (?, ?, 'research', ?, ?, ?, ?)
      `).bind(
        result.runId,
        result.query,
        result.status,
        JSON.stringify({ providers: result.searchedProviders, planning: result.planning }),
        result.completedAt,
        result.completedAt,
      ),
      ...result.candidates.map((source, index) => sourceInsert(this.database, source, storedIds[index])),
    ];
    for (const [index, source] of result.candidates.entries()) {
      statements.push(this.database.prepare(`
        INSERT OR REPLACE INTO research_run_sources (
          research_run_id, source_id, provider, rank, disposition
        ) VALUES (?, ?, ?, ?, 'candidate')
      `).bind(result.runId, storedIds[index], source.provider, index + 1));
    }
    await this.database.batch(statements);
  }
}
