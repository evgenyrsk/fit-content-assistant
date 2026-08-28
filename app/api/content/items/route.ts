import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { ContentArchiveResult } from '@/lib/domain';
import { D1ContentArchiveReader } from '@/lib/infrastructure/d1/d1-content-archive-reader';
import { ensureContentSchema } from '@/lib/infrastructure/d1/ensure-content-schema';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Архив контента пока недоступен.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensureKnowledgeSchema(database);
    await ensureContentSchema(database);
    const result: ContentArchiveResult = {
      items: await new D1ContentArchiveReader(database).listLatest(100),
      canonical: true, generatedAt: new Date().toISOString(),
    };
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Не удалось загрузить архив контента.' }, { status: 503 });
  }
}
