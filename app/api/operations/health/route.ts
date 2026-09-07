import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { D1OperationsHealthReader } from '@/lib/infrastructure/d1/d1-operations-health-reader';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

export async function GET(): Promise<Response> {
  const bindings = env as unknown as Record<string, string | D1Database | undefined>;
  const database = bindings.DB && typeof bindings.DB !== 'string' ? bindings.DB : null;
  if (!database) return Response.json({ error: 'Operational status unavailable.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensurePipelineSchema(database);
    const result = await new D1OperationsHealthReader(database).inspect(new Date().toISOString());
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Operational status unavailable.' }, { status: 503 });
  }
}
