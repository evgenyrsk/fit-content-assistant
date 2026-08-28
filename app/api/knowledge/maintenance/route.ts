import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { D1KnowledgeMaintenanceReader } from '@/lib/infrastructure/d1/d1-knowledge-maintenance-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Центр обслуживания недоступен.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensureKnowledgeSchema(database);
    await ensurePipelineSchema(database);
    return Response.json(await new D1KnowledgeMaintenanceReader(database).inspect(new Date().toISOString()));
  } catch {
    return Response.json({ error: 'Не удалось проверить актуальность базы.' }, { status: 503 });
  }
}
