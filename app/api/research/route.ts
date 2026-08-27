import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { executeResearchPlan } from '@/lib/application/orchestration/execute-research-plan';
import { researchPlanPrompt } from '@/lib/application/orchestration/research-plan-prompt';
import { buildScientificQuery } from '@/lib/application/use-cases/build-scientific-query';
import { searchScientificSources } from '@/lib/application/use-cases/search-scientific-sources';
import { methodologyRelease } from '@/lib/domain';
import type { ResearchPlanningTrace } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1ModelRunStore } from '@/lib/infrastructure/d1/d1-model-run-store';
import { CrossrefSearch } from '@/lib/infrastructure/scientific/crossref-search';
import { PubmedSearch } from '@/lib/infrastructure/scientific/pubmed-search';
import { D1ResearchRunStore } from '@/lib/infrastructure/d1/d1-research-run-store';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { createLlmRuntime } from '@/lib/infrastructure/llm/create-llm-runtime';

interface ResearchRequestBody {
  query?: unknown;
}

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

type PlanningOutcome = {
  trace: ResearchPlanningTrace;
  modelRun?: Awaited<ReturnType<typeof executeResearchPlan>>['modelRun'];
};

async function planResearch(query: string, runId: string, runtime: ReturnType<typeof createLlmRuntime>): Promise<PlanningOutcome> {
  const fallbackQuery = buildScientificQuery(query);
  if (!runtime) {
    return { trace: { mode: 'awaiting_provider', searchQuery: fallbackQuery, promptVersion: researchPlanPrompt.version, reviewRequired: true } };
  }
  const execution = await executeResearchPlan(query, { ...runtime, researchRunId: runId });
  if (!execution.plan) {
    return {
      modelRun: execution.modelRun,
      trace: {
        mode: 'deterministic_fallback', searchQuery: fallbackQuery,
        promptVersion: researchPlanPrompt.version, reviewRequired: true,
        provider: runtime.provider.id, model: runtime.model,
      },
    };
  }
  return {
    modelRun: execution.modelRun,
    trace: {
      mode: 'model_draft', searchQuery: execution.plan.searchQuery,
      promptVersion: researchPlanPrompt.version, reviewRequired: true,
      provider: execution.modelRun.provider, model: execution.modelRun.model,
      draft: execution.plan,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as ResearchRequestBody;
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (query.length < 3 || query.length > 500) {
    return Response.json({ error: 'Введите вопрос длиной от 3 до 500 символов.' }, { status: 400 });
  }
  const runtime = bindings();
  if (!runtime.DB || typeof runtime.DB === 'string') {
    return Response.json({ error: 'Хранилище исследований пока недоступно.' }, { status: 503 });
  }
  const searches = [
    new PubmedSearch({ apiKey: runtime.PUBMED_API_KEY as string, email: runtime.NCBI_EMAIL as string }),
    new CrossrefSearch({ mailto: runtime.CROSSREF_MAILTO as string }),
  ];
  try {
    await ensureResearchSchema(runtime.DB);
    await ensurePipelineSchema(runtime.DB);
    const runId = crypto.randomUUID();
    const planning = await planResearch(query, runId, createLlmRuntime(runtime));
    const result = await searchScientificSources(query, 10, {
      searches,
      retrievalQuery: planning.trace.searchQuery,
      createId: () => runId,
    });
    const completed = { ...result, planning: planning.trace };
    await new D1ResearchRunStore(runtime.DB).saveSearch(completed);
    if (planning.modelRun) await new D1ModelRunStore(runtime.DB).save(planning.modelRun);
    await new D1AuditEventStore(runtime.DB).save({
      id: crypto.randomUUID(), aggregateType: 'research_run', aggregateId: runId,
      eventType: 'research_planning_completed',
      actorType: planning.trace.mode === 'model_draft' ? 'model' : 'system',
      payload: {
        planningMode: planning.trace.mode, promptVersion: planning.trace.promptVersion,
        modelRunId: planning.modelRun?.runId, methodologyVersion: methodologyRelease.version,
        automaticClaimApprovalEnabled: methodologyRelease.automatedClaimApprovalEnabled,
      },
      occurredAt: result.completedAt,
    });
    return Response.json(completed);
  } catch {
    return Response.json({ error: 'Не удалось сохранить исследовательский запуск. Попробуйте ещё раз.' }, { status: 503 });
  }
}
