import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { submitSourceReview } from '@/lib/application/use-cases/submit-source-review';
import type { HumanSourceReviewDecision } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1SourceReviewDecisionStore } from '@/lib/infrastructure/d1/d1-source-review-decision-store';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

interface ReviewBody {
  sourceId?: unknown;
  decision?: unknown;
  reason?: unknown;
}

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function reviewerId(request: Request): string {
  return request.headers.get('oai-authenticated-user-id')?.slice(0, 160) || 'site-owner';
}

function bodyValues(body: ReviewBody): { sourceId: string; decision: HumanSourceReviewDecision; reason: string } | null {
  if (typeof body.sourceId !== 'string' || typeof body.decision !== 'string' || typeof body.reason !== 'string') return null;
  if (!['included', 'excluded', 'needs_follow_up'].includes(body.decision)) return null;
  return { sourceId: body.sourceId, decision: body.decision as HumanSourceReviewDecision, reason: body.reason };
}

export async function POST(request: Request): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Хранилище решений недоступно.' }, { status: 503 });
  try {
    const values = bodyValues(await request.json() as ReviewBody);
    if (!values) return Response.json({ error: 'Проверьте решение и причину.' }, { status: 400 });
    await ensureResearchSchema(database);
    await ensureEvidenceSchema(database);
    await ensurePipelineSchema(database);
    const review = await submitSourceReview({ ...values, reviewerId: reviewerId(request) }, {
      decisions: new D1SourceReviewDecisionStore(database),
      audit: new D1AuditEventStore(database),
    });
    return Response.json({ review });
  } catch (cause) {
    const invalid = cause instanceof Error && cause.message.includes('12–600');
    return Response.json({
      error: invalid ? 'Причина должна содержать от 12 до 600 символов.' : 'Не удалось сохранить решение.',
    }, { status: invalid ? 400 : 503 });
  }
}
