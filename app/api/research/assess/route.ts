import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { executeSourceAssessment } from '@/lib/application/orchestration/execute-source-assessment';
import type { SourceAssessmentResponse } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1ModelRunStore } from '@/lib/infrastructure/d1/d1-model-run-store';
import { D1SourceAssessmentStore } from '@/lib/infrastructure/d1/d1-source-assessment-store';
import { D1SourceDocumentStore } from '@/lib/infrastructure/d1/d1-source-document-store';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { createLlmRuntime } from '@/lib/infrastructure/llm/create-llm-runtime';

interface AssessmentRequestBody {
  researchRunId?: unknown;
  sourceId?: unknown;
  question?: unknown;
}

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

function validBody(body: AssessmentRequestBody): body is { researchRunId: string; sourceId: string; question: string } {
  return typeof body.researchRunId === 'string' && body.researchRunId.length <= 100
    && typeof body.sourceId === 'string' && /^pmid:\d+$/.test(body.sourceId)
    && typeof body.question === 'string' && body.question.trim().length >= 3 && body.question.length <= 500;
}

async function researchRunExists(database: D1Database, id: string): Promise<boolean> {
  return Boolean(await database.prepare('SELECT id FROM research_runs WHERE id = ?').bind(id).first());
}

function awaitingResponse(contentLevel: SourceAssessmentResponse['contentLevel']): SourceAssessmentResponse {
  return {
    status: 'awaiting_provider', reviewRequired: true, contentLevel, assessment: null,
    warning: 'Оценка источника включится после подключения серверной LLM. Claim пока не создаётся.',
  };
}

async function performAssessment(
  body: { researchRunId: string; sourceId: string; question: string },
  database: D1Database,
  runtime: ReturnType<typeof bindings>,
): Promise<Response> {
  await ensureResearchSchema(database);
  await ensureEvidenceSchema(database);
  await ensurePipelineSchema(database);
  if (!await researchRunExists(database, body.researchRunId)) {
    return Response.json({ error: 'Исследовательский запуск не найден.' }, { status: 404 });
  }
  const document = await new D1SourceDocumentStore(database).findById(body.sourceId);
  if (!document) return Response.json({ error: 'Сохранённый документ не найден.' }, { status: 404 });
  const llm = createLlmRuntime(runtime);
  if (!llm) return Response.json(awaitingResponse(document.contentLevel));
  const execution = await executeSourceAssessment(body.question.trim(), document, {
    ...llm, researchRunId: body.researchRunId,
  });
  await new D1ModelRunStore(database).save(execution.modelRun);
  if (execution.assessment) await new D1SourceAssessmentStore(database).save(execution.assessment);
  await new D1AuditEventStore(database).save({
    id: crypto.randomUUID(), aggregateType: 'research_run', aggregateId: body.researchRunId,
    eventType: 'source_assessment_completed', actorType: execution.assessment ? 'model' : 'system',
    payload: {
      sourceId: body.sourceId, modelRunId: execution.modelRun.runId,
      assessmentId: execution.assessment?.id, gate: execution.assessment?.gate.decision ?? 'needs_review',
      contentLevel: document.contentLevel,
    },
    occurredAt: execution.modelRun.completedAt,
  });
  const response: SourceAssessmentResponse = {
    status: execution.status, reviewRequired: true, contentLevel: document.contentLevel,
    assessment: execution.assessment,
    warning: document.contentLevel === 'full_text'
      ? 'Это модельный черновик. До калибровки требуется подтверждение человека.'
      : 'Доступна только аннотация. Она недостаточна для утверждения claim.',
  };
  return Response.json(response);
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as AssessmentRequestBody;
  if (!validBody(body)) return Response.json({ error: 'Некорректный запрос на оценку источника.' }, { status: 400 });
  const runtime = bindings();
  if (!runtime.DB || typeof runtime.DB === 'string') {
    return Response.json({ error: 'Хранилище исследований пока недоступно.' }, { status: 503 });
  }
  try {
    return await performAssessment(body, runtime.DB, runtime);
  } catch {
    return Response.json({ error: 'Не удалось выполнить оценку источника.' }, { status: 503 });
  }
}
