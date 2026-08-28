import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { D1ManualClaimEvidenceReader } from '@/lib/infrastructure/d1/d1-manual-claim-evidence-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Evidence-хранилище пока недоступно.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensureKnowledgeSchema(database);
    const options = await new D1ManualClaimEvidenceReader(database).listEligible(80);
    return Response.json({ options, generatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: 'Не удалось загрузить допустимые evidence-фрагменты.' }, { status: 503 });
  }
}
