import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { revalidateSourceRecords } from '@/lib/application/use-cases/revalidate-source-records';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1SourceDocumentStore } from '@/lib/infrastructure/d1/d1-source-document-store';
import { D1SourceReviewQueueReader } from '@/lib/infrastructure/d1/d1-source-review-queue-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { PubmedDocumentLoader } from '@/lib/infrastructure/scientific/pubmed-document-loader';

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

function authorized(request: Request, secret: string | undefined): boolean {
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(request: Request): Promise<Response> {
  const settings = bindings();
  if (!authorized(request, typeof settings.CRON_SECRET === 'string' ? settings.CRON_SECRET : undefined)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const database = settings.DB && typeof settings.DB !== 'string' ? settings.DB : null;
  if (!database) return Response.json({ error: 'Revalidation storage unavailable.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensurePipelineSchema(database);
    const candidates = await new D1SourceReviewQueueReader(database).listDuePubmed(25, new Date().toISOString());
    const result = await revalidateSourceRecords(candidates, {
      loader: new PubmedDocumentLoader({
        apiKey: typeof settings.PUBMED_API_KEY === 'string' ? settings.PUBMED_API_KEY : undefined,
        email: typeof settings.NCBI_EMAIL === 'string' ? settings.NCBI_EMAIL : undefined,
      }),
      documents: new D1SourceDocumentStore(database), audit: new D1AuditEventStore(database),
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: 'PubMed revalidation failed.' }, { status: 503 });
  }
}
