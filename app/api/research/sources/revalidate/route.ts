import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { revalidateSourceRecords } from '@/lib/application/use-cases/revalidate-source-records';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1SourceDocumentStore } from '@/lib/infrastructure/d1/d1-source-document-store';
import { D1SourceIntegrityMaintenanceStore } from '@/lib/infrastructure/d1/d1-source-integrity-maintenance-store';
import { D1SourceReviewQueueReader } from '@/lib/infrastructure/d1/d1-source-review-queue-reader';
import { ensureContentSchema } from '@/lib/infrastructure/d1/ensure-content-schema';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureOperationsSchema } from '@/lib/infrastructure/d1/ensure-operations-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { PubmedDocumentLoader } from '@/lib/infrastructure/scientific/pubmed-document-loader';

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

export async function POST(): Promise<Response> {
  const settings = bindings();
  const database = settings.DB && typeof settings.DB !== 'string' ? settings.DB : null;
  if (!database) return Response.json({ error: 'Перепроверка пока недоступна.' }, { status: 503 });
  try {
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensureKnowledgeSchema(database);
    await ensureContentSchema(database);
    await ensureOperationsSchema(database);
    await ensurePipelineSchema(database);
    const queue = new D1SourceReviewQueueReader(database);
    const candidates = await queue.listDuePubmed(10, new Date().toISOString());
    const result = await revalidateSourceRecords(candidates, {
      loader: new PubmedDocumentLoader({
        apiKey: typeof settings.PUBMED_API_KEY === 'string' ? settings.PUBMED_API_KEY : undefined,
        email: typeof settings.NCBI_EMAIL === 'string' ? settings.NCBI_EMAIL : undefined,
      }),
      documents: new D1SourceDocumentStore(database),
      maintenance: new D1SourceIntegrityMaintenanceStore(database),
      audit: new D1AuditEventStore(database),
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Не удалось перепроверить записи PubMed.' }, { status: 503 });
  }
}
