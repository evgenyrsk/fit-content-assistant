import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { executeBodyAssessment } from '@/lib/application/orchestration/execute-body-assessment';
import { methodologyRelease, type BodyAssessmentResponse } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1BodyAssessmentStore } from '@/lib/infrastructure/d1/d1-body-assessment-store';
import { D1ModelRunStore } from '@/lib/infrastructure/d1/d1-model-run-store';
import { D1SourceAssessmentReader } from '@/lib/infrastructure/d1/d1-source-assessment-reader';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { createLlmRuntime } from '@/lib/infrastructure/llm/create-llm-runtime';

interface SynthesisRequestBody {
  researchRunId?: unknown;
  question?: unknown;
  outcomeId?: unknown;
}

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

function validBody(body: SynthesisRequestBody): body is { researchRunId: string; question: string; outcomeId: string } {
  return typeof body.researchRunId === 'string' && body.researchRunId.length <= 100
    && typeof body.question === 'string' && body.question.trim().length >= 3 && body.question.length <= 500
    && typeof body.outcomeId === 'string' && body.outcomeId.trim().length >= 1 && body.outcomeId.length <= 200;
}

function response(status: BodyAssessmentResponse['status'], body: BodyAssessmentResponse['body'], warning: string): BodyAssessmentResponse {
  return { status, body, warning, reviewRequired: true };
}

async function synthesize(
  body: { researchRunId: string; question: string; outcomeId: string },
  database: D1Database,
  runtime: ReturnType<typeof bindings>,
): Promise<Response> {
  await ensureResearchSchema(database);
  await ensureEvidenceSchema(database);
  await ensurePipelineSchema(database);
  const assessments = await new D1SourceAssessmentReader(database).listForResearchRun(body.researchRunId);
  const llm = createLlmRuntime(runtime);
  if (!llm) return Response.json(response('awaiting_provider', null, 'Body assessment включится после подключения серверной LLM.'));
  const execution = await executeBodyAssessment(body.question.trim(), body.outcomeId.trim(), assessments, {
    ...llm, researchRunId: body.researchRunId,
    methodologyVersion: methodologyRelease.version,
    methodologyCalibrated: methodologyRelease.calibrated,
  });
  await new D1ModelRunStore(database).save(execution.modelRun);
  if (execution.body) await new D1BodyAssessmentStore(database).save(execution.body);
  await new D1AuditEventStore(database).save({
    id: crypto.randomUUID(), aggregateType: 'research_run', aggregateId: body.researchRunId,
    eventType: 'body_assessment_completed', actorType: execution.body ? 'model' : 'system',
    payload: {
      bodyAssessmentId: execution.body?.id, modelRunId: execution.modelRun.runId,
      gate: execution.body?.gate.decision ?? 'needs_review', assessmentCount: assessments.length,
    },
    occurredAt: execution.modelRun.completedAt,
  });
  const warning = execution.body
    ? 'Совокупность данных сохранена как модельный черновик. Claim заблокирован до человеческого подтверждения и калибровки.'
    : 'Нет источников, прошедших evidence gate, либо модельный ответ не прошёл контракт.';
  return Response.json(response(execution.status, execution.body, warning));
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as SynthesisRequestBody;
  if (!validBody(body)) return Response.json({ error: 'Некорректный запрос на синтез evidence.' }, { status: 400 });
  const runtime = bindings();
  if (!runtime.DB || typeof runtime.DB === 'string') {
    return Response.json({ error: 'Хранилище исследований пока недоступно.' }, { status: 503 });
  }
  try {
    return await synthesize(body, runtime.DB, runtime);
  } catch {
    return Response.json({ error: 'Не удалось собрать оценку совокупности данных.' }, { status: 503 });
  }
}
