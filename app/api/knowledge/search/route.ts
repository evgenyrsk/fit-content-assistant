import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { normalizeSearchQuery } from '@/lib/domain';
import { D1KnowledgeSearchReader } from '@/lib/infrastructure/d1/d1-knowledge-search-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

export async function GET(request: Request): Promise<Response> {
  const query = normalizeSearchQuery(new URL(request.url).searchParams.get('q') ?? '');
  if (query.length < 2) return Response.json({ error: 'Введите минимум 2 символа.' }, { status: 400 });
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Поиск по знаниям недоступен.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensureKnowledgeSchema(database);
    return Response.json(await new D1KnowledgeSearchReader(database).search(query, 12));
  } catch {
    return Response.json({ error: 'Не удалось выполнить поиск.' }, { status: 503 });
  }
}
