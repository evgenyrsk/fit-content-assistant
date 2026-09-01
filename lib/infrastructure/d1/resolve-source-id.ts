import type { D1Database } from '@cloudflare/workers-types';

interface SourceIdentity {
  sourceId: string;
  pmid?: string;
  doi?: string;
}

interface SourceIdRow { id: string }

function pmidFromId(sourceId: string): string | undefined {
  return sourceId.startsWith('pmid:') ? sourceId.slice(5) : undefined;
}

export async function resolveStoredSourceId(database: D1Database, identity: SourceIdentity): Promise<string> {
  const pmid = identity.pmid ?? pmidFromId(identity.sourceId) ?? null;
  const doi = identity.doi?.toLowerCase() ?? null;
  const existing = await database.prepare(`
    SELECT id FROM sources
    WHERE id = ?
      OR (? IS NOT NULL AND pmid = ?)
      OR (? IS NOT NULL AND LOWER(doi) = ?)
    ORDER BY CASE WHEN id = ? THEN 0 WHEN pmid = ? THEN 1 ELSE 2 END
    LIMIT 1
  `).bind(identity.sourceId, pmid, pmid, doi, doi, identity.sourceId, pmid).first<SourceIdRow>();
  return existing?.id ?? identity.sourceId;
}
