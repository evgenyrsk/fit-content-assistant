import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { executeClaimSynthesis } from '@/lib/application/orchestration/execute-claim-synthesis';
import type { ClaimSynthesisResponse } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1BodyAssessmentReader } from '@/lib/infrastructure/d1/d1-body-assessment-reader';
import { D1ClaimDraftStore } from '@/lib/infrastructure/d1/d1-claim-draft-store';
import { D1ModelRunStore } from '@/lib/infrastructure/d1/d1-model-run-store';
import { D1SourceAssessmentReader } from '@/lib/infrastructure/d1/d1-source-assessment-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { createLlmRuntime } from '@/lib/infrastructure/llm/create-llm-runtime';
import { claimDraftFailureWarning, emptyClaimSynthesisResponse } from './route-contract';

interface RequestBody { bodyAssessmentId?: unknown }

function database(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

async function ensureSchemas(d1: D1Database): Promise<void> {
  await ensureResearchSchema(d1); await ensureEvidenceSchema(d1);
  await ensureKnowledgeSchema(d1); await ensurePipelineSchema(d1);
}

export async function POST(request: Request): Promise<Response> {
  const d1 = database();
  if (!d1) return Response.json({ error: 'База знаний пока недоступна.' }, { status: 503 });
  const input = await request.json().catch(() => ({})) as RequestBody;
  if (typeof input.bodyAssessmentId !== 'string' || input.bodyAssessmentId.length > 100) {
    return Response.json({ error: 'Некорректная совокупная оценка.' }, { status: 400 });
  }
  try {
    await ensureSchemas(d1);
    const context = await new D1BodyAssessmentReader(d1).findById(input.bodyAssessmentId, []);
    if (!context) return Response.json({ error: 'Совокупная оценка не найдена.' }, { status: 404 });
    const summaries = await new D1SourceAssessmentReader(d1).listForResearchRun(context.researchRunId);
    const body = await new D1BodyAssessmentReader(d1).findById(input.bodyAssessmentId, summaries);
    if (!body) return Response.json({ error: 'Совокупная оценка не найдена.' }, { status: 404 });
    const runtime = createLlmRuntime(env as unknown as Record<string, string | undefined>, 'review');
    if (!runtime) return Response.json(emptyClaimSynthesisResponse('awaiting_provider', 'Claim draft включится после подключения review-модели.'));
    const execution = await executeClaimSynthesis(body, summaries, { ...runtime, researchRunId: body.researchRunId });
    await new D1ModelRunStore(d1).save(execution.modelRun);
    if (!execution.claim) return Response.json(emptyClaimSynthesisResponse(
      'needs_review', claimDraftFailureWarning(execution.gate), execution.gate,
    ));
    const saved = await new D1ClaimDraftStore(d1).save(execution.claim);
    await new D1AuditEventStore(d1).save({
      id: crypto.randomUUID(), aggregateType: 'claim', aggregateId: saved.claimId,
      eventType: 'model_claim_draft_created', actorType: 'model', occurredAt: execution.claim.createdAt,
      payload: { claimVersionId: saved.versionId, version: saved.version, bodyAssessmentId: body.id, status: 'needs_review' },
    });
    const payload: ClaimSynthesisResponse = {
      status: 'model_draft', reviewRequired: true, claim: execution.claim, saved, gate: execution.gate,
      warning: 'Черновик сохранён. Он не считается знанием и не доступен Content Engine до отдельного human claim review.',
    };
    return Response.json(payload, { status: 201 });
  } catch {
    return Response.json({ error: 'Не удалось подготовить claim draft.' }, { status: 503 });
  }
}
