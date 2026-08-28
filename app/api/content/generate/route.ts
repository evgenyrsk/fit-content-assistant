import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { executeContentPipeline } from '@/lib/application/orchestration/execute-content-pipeline';
import type { ContentFormat, ContentPipelineResponse, ContentPipelineStage } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1ContentItemStore } from '@/lib/infrastructure/d1/d1-content-item-store';
import { D1KnowledgeClaimReader } from '@/lib/infrastructure/d1/d1-knowledge-claim-reader';
import { D1ModelRunStore } from '@/lib/infrastructure/d1/d1-model-run-store';
import { ensureContentSchema } from '@/lib/infrastructure/d1/ensure-content-schema';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { createLlmRuntime } from '@/lib/infrastructure/llm/create-llm-runtime';
import type { ContentPipelineExecution } from '@/lib/application/orchestration/execute-content-pipeline';
import type { KnowledgeClaimRecord } from '@/lib/domain';

interface GenerateRequestBody {
  format?: unknown;
  audience?: unknown;
  goal?: unknown;
}

const formats: ContentFormat[] = ['reels', 'telegram', 'threads', 'carousel'];
const stages: ContentPipelineStage[] = ['content_brief', 'platform_draft', 'voice_edit', 'fact_review'];

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

function validBody(body: GenerateRequestBody): body is { format: ContentFormat; audience?: string; goal?: string } {
  return typeof body.format === 'string' && formats.includes(body.format as ContentFormat)
    && (body.audience === undefined || (typeof body.audience === 'string' && body.audience.length <= 300))
    && (body.goal === undefined || (typeof body.goal === 'string' && body.goal.length <= 500));
}

function waitingResponse(status: 'awaiting_claims' | 'awaiting_provider', message: string): ContentPipelineResponse {
  return {
    status, message, contentItem: null, publishable: false, reviewRequired: true,
    stages: stages.map((stage) => ({ stage, status: 'waiting', message: 'Этап ещё не запускался.' })),
  };
}

async function ensureSchemas(database: D1Database): Promise<void> {
  await ensureResearchSchema(database);
  await ensureEvidenceSchema(database);
  await ensureKnowledgeSchema(database);
  await ensureContentSchema(database);
  await ensurePipelineSchema(database);
}

function databaseFrom(runtime: Record<string, string | D1Database | undefined>): D1Database | null {
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

async function persistExecution(
  database: D1Database,
  execution: ContentPipelineExecution,
  format: ContentFormat,
  claims: KnowledgeClaimRecord[],
): Promise<void> {
  const storedRuns = execution.contentItem
    ? execution.modelRuns
    : execution.modelRuns.map((run) => ({ ...run, contentItemId: undefined }));
  if (execution.contentItem) await new D1ContentItemStore(database).save(execution.contentItem);
  const modelStore = new D1ModelRunStore(database);
  for (const modelRun of storedRuns) await modelStore.save(modelRun);
  const aggregateId = execution.contentItem?.id ?? execution.modelRuns[0]?.runId ?? crypto.randomUUID();
  await new D1AuditEventStore(database).save({
    id: crypto.randomUUID(), aggregateType: 'content_item', aggregateId,
    eventType: 'content_pipeline_completed', actorType: 'system',
    payload: {
      format, status: execution.status,
      modelRunIds: execution.modelRuns.map((run) => run.runId),
      claimVersionIds: execution.contentItem?.brief.requiredClaimVersionIds ?? claims.map((claim) => claim.id),
    },
    occurredAt: new Date().toISOString(),
  });
}

function executionResponse(execution: ContentPipelineExecution): ContentPipelineResponse {
  const message = execution.status === 'ready_for_human_review'
    ? 'Фактический gate пройден. Черновик сохранён и ждёт вашего финального просмотра.'
    : 'Конвейер остановлен: один из этапов не прошёл строгий gate.';
  return {
    status: execution.status, message, stages: execution.stages, contentItem: execution.contentItem,
    publishable: false, reviewRequired: true,
  };
}

async function generate(
  runtime: Record<string, string | D1Database | undefined>,
  database: D1Database,
  body: { format: ContentFormat; audience?: string; goal?: string },
): Promise<Response> {
  await ensureSchemas(database);
  const claims = await new D1KnowledgeClaimReader(database).listApproved(8, new Date().toISOString());
  if (claims.length === 0) return Response.json(waitingResponse(
    'awaiting_claims', 'Нужен хотя бы один свежий approved-claim. Демо-текст не подставляется.',
  ));
  const contentRuntime = createLlmRuntime(runtime, 'content');
  const reviewRuntime = createLlmRuntime(runtime, 'research');
  if (!contentRuntime || !reviewRuntime) return Response.json(waitingResponse(
    'awaiting_provider', 'Claims готовы, но серверные модели content и research ещё не подключены.',
  ));
  const execution = await executeContentPipeline({
    format: body.format, audience: body.audience?.trim() || 'русскоязычные взрослые, интересующиеся фитнесом',
    goal: body.goal?.trim(), claims, contentRuntime, reviewRuntime,
  });
  await persistExecution(database, execution, body.format, claims);
  return Response.json(executionResponse(execution));
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as GenerateRequestBody;
  if (!validBody(body)) return Response.json({ error: 'Некорректные параметры контентного конвейера.' }, { status: 400 });
  const runtime = bindings();
  const database = databaseFrom(runtime);
  if (!database) {
    return Response.json({ error: 'Хранилище контента пока недоступно.' }, { status: 503 });
  }
  try {
    return await generate(runtime, database, body);
  } catch {
    return Response.json({ error: 'Не удалось выполнить контентный конвейер.' }, { status: 503 });
  }
}
