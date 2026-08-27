import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { KnowledgeClaimResult } from '@/lib/domain';
import { D1KnowledgeClaimReader } from '@/lib/infrastructure/d1/d1-knowledge-claim-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'База знаний пока недоступна.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensureKnowledgeSchema(database);
    const result: KnowledgeClaimResult = {
      claims: await new D1KnowledgeClaimReader(database).listLatest(100),
      canonical: true,
      generatedAt: new Date().toISOString(),
    };
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Не удалось загрузить базу знаний.' }, { status: 503 });
  }
}
