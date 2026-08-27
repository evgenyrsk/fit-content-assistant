import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { SourceReviewQueueResult } from '@/lib/domain';
import { D1SourceReviewQueueReader, revalidationIntervalDays } from '@/lib/infrastructure/d1/d1-source-review-queue-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Очередь источников пока недоступна.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    const result: SourceReviewQueueResult = {
      sources: await new D1SourceReviewQueueReader(database).listLatest(60),
      generatedAt: new Date().toISOString(),
      revalidationIntervalDays,
    };
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Не удалось загрузить очередь источников.' }, { status: 503 });
  }
}
