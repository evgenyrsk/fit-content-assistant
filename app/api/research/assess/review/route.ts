import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { submitSourceAssessmentReview } from '@/lib/application/use-cases/submit-source-assessment-review';
import type { EvidenceReviewDecision } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1SourceAssessmentReviewRepository } from '@/lib/infrastructure/d1/d1-source-assessment-review-repository';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';

interface ReviewBody {
  assessmentId?: unknown;
  decision?: unknown;
  findingChecked?: unknown;
  provenanceChecked?: unknown;
  scopeChecked?: unknown;
  reason?: unknown;
}

function database(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function reviewerId(request: Request): string {
  return request.headers.get('oai-authenticated-user-id')?.slice(0, 160) || 'site-owner';
}

function values(body: ReviewBody, request: Request) {
  if (typeof body.assessmentId !== 'string' || typeof body.decision !== 'string'
    || typeof body.reason !== 'string' || !['confirmed', 'rejected', 'needs_more_information'].includes(body.decision)) return null;
  return {
    assessmentId: body.assessmentId, decision: body.decision as EvidenceReviewDecision,
    findingChecked: body.findingChecked === true, provenanceChecked: body.provenanceChecked === true,
    scopeChecked: body.scopeChecked === true, reason: body.reason, reviewerId: reviewerId(request),
  };
}

export async function POST(request: Request): Promise<Response> {
  const d1 = database();
  if (!d1) return Response.json({ error: 'Хранилище review недоступно.' }, { status: 503 });
  try {
    const input = values(await request.json() as ReviewBody, request);
    if (!input) return Response.json({ error: 'Проверьте решение и подтверждения.' }, { status: 400 });
    await ensureEvidenceSchema(d1); await ensurePipelineSchema(d1);
    const review = await submitSourceAssessmentReview(input, {
      reviews: new D1SourceAssessmentReviewRepository(d1), audit: new D1AuditEventStore(d1),
    });
    return Response.json({ review });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : '';
    if (!['hard_stop', 'checks_required', 'assessment_not_found', 'invalid_reason', 'invalid_review'].includes(code)) {
      return Response.json({ error: 'Не удалось сохранить review.' }, { status: 503 });
    }
    const message = code === 'hard_stop' ? 'Исключённый или контекстный источник нельзя подтвердить для синтеза.'
      : code === 'checks_required' ? 'Для подтверждения отметьте результат, provenance и область применимости.'
      : code === 'assessment_not_found' ? 'Оценка не найдена.' : 'Добавьте обоснование длиной от 12 до 600 символов.';
    return Response.json({ error: message }, { status: code === 'assessment_not_found' ? 404 : 400 });
  }
}
