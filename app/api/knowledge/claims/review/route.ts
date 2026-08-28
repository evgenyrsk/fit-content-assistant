import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { prepareManualClaimReview } from '@/lib/application/use-cases/prepare-manual-claim-review';
import type { ManualClaimReviewContext, ManualClaimReviewRecord } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1ManualClaimEvidenceReader } from '@/lib/infrastructure/d1/d1-manual-claim-evidence-reader';
import { D1ManualClaimReviewStore } from '@/lib/infrastructure/d1/d1-manual-claim-review-store';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

async function ensureSchemas(database: D1Database): Promise<void> {
  await ensureResearchSchema(database);
  await ensureEvidenceSchema(database);
  await ensureKnowledgeSchema(database);
  await ensurePipelineSchema(database);
}

function versionId(request: Request): string {
  return new URL(request.url).searchParams.get('versionId')?.trim() ?? '';
}

export async function GET(request: Request): Promise<Response> {
  const database = databaseBinding();
  const id = versionId(request);
  if (!database) return Response.json({ error: 'База знаний пока недоступна.' }, { status: 503 });
  if (!id || id.length > 160) return Response.json({ error: 'Не указана версия claim.' }, { status: 400 });
  try {
    await ensureSchemas(database);
    const context = await new D1ManualClaimEvidenceReader(database).findReviewContext(id);
    return context ? Response.json(context) : Response.json({ error: 'Claim не найден.' }, { status: 404 });
  } catch {
    return Response.json({ error: 'Не удалось загрузить review-контекст.' }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const database = databaseBinding();
  const id = versionId(request);
  if (!database) return Response.json({ error: 'База знаний пока недоступна.' }, { status: 503 });
  if (!id || id.length > 160) return Response.json({ error: 'Не указана версия claim.' }, { status: 400 });
  let context: ManualClaimReviewContext;
  let review: ManualClaimReviewRecord;
  try {
    await ensureSchemas(database);
    const found = await new D1ManualClaimEvidenceReader(database).findReviewContext(id);
    if (!found) return Response.json({ error: 'Claim не найден.' }, { status: 404 });
    context = found;
    review = prepareManualClaimReview(await request.json() as unknown, found);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Некорректный review.';
    return Response.json({ error: message }, { status: 400 });
  }
  try {
    await new D1ManualClaimReviewStore(database).save(review);
    await new D1AuditEventStore(database).save({
      id: crypto.randomUUID(), aggregateType: 'claim', aggregateId: context.claim.claimId,
      eventType: 'manual_claim_reviewed', actorType: 'human',
      payload: { claimVersionId: id, reviewId: review.id, decision: review.decision },
      occurredAt: review.createdAt,
    });
    return Response.json({ status: review.decision, claimVersionId: id, reviewRequired: false });
  } catch {
    return Response.json({ error: 'Не удалось сохранить review.' }, { status: 503 });
  }
}
