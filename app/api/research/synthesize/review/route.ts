import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { submitBodyAssessmentReview } from '@/lib/application/use-cases/submit-body-assessment-review';
import type { EvidenceReviewDecision } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1BodyAssessmentReviewRepository } from '@/lib/infrastructure/d1/d1-body-assessment-review-repository';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { bodyReviewResponse } from './route-contract';

interface ReviewBody {
  bodyAssessmentId?: unknown; decision?: unknown; evidenceSetChecked?: unknown;
  contradictionsChecked?: unknown; certaintyChecked?: unknown; scopeChecked?: unknown; reason?: unknown;
}

function database(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function values(body: ReviewBody, request: Request) {
  if (typeof body.bodyAssessmentId !== 'string' || typeof body.decision !== 'string'
    || typeof body.reason !== 'string' || !['confirmed', 'rejected', 'needs_more_information'].includes(body.decision)) return null;
  return {
    bodyAssessmentId: body.bodyAssessmentId, decision: body.decision as EvidenceReviewDecision,
    evidenceSetChecked: body.evidenceSetChecked === true, contradictionsChecked: body.contradictionsChecked === true,
    certaintyChecked: body.certaintyChecked === true, scopeChecked: body.scopeChecked === true,
    reason: body.reason, reviewerId: request.headers.get('oai-authenticated-user-id')?.slice(0, 160) || 'site-owner',
  };
}

export async function POST(request: Request): Promise<Response> {
  const d1 = database();
  if (!d1) return Response.json({ error: 'Хранилище review недоступно.' }, { status: 503 });
  try {
    const input = values(await request.json() as ReviewBody, request);
    if (!input) return Response.json({ error: 'Проверьте решение и подтверждения.' }, { status: 400 });
    await ensureEvidenceSchema(d1); await ensurePipelineSchema(d1);
    const review = await submitBodyAssessmentReview(input, {
      reviews: new D1BodyAssessmentReviewRepository(d1), audit: new D1AuditEventStore(d1),
    });
    return Response.json(bodyReviewResponse(review));
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : '';
    if (!['checks_required', 'assessment_not_found', 'invalid_reason', 'invalid_review'].includes(code)) {
      return Response.json({ error: 'Не удалось сохранить review.' }, { status: 503 });
    }
    const message = code === 'checks_required' ? 'Для подтверждения отметьте evidence set, противоречия, уверенность и scope.'
      : code === 'assessment_not_found' ? 'Совокупная оценка не найдена.' : 'Добавьте обоснование длиной от 12 до 600 символов.';
    return Response.json({ error: message }, { status: code === 'assessment_not_found' ? 404 : 400 });
  }
}
