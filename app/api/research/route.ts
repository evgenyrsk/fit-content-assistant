import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { executeResearchPlan } from '@/lib/application/orchestration/execute-research-plan';
import { researchPlanPrompt } from '@/lib/application/orchestration/research-plan-prompt';
import { buildScientificQuery } from '@/lib/application/use-cases/build-scientific-query';
import { ingestFullTextDocuments } from '@/lib/application/use-cases/ingest-full-text-documents';
import { ingestSourceDocuments } from '@/lib/application/use-cases/ingest-source-documents';
import { reuseStoredFullText } from '@/lib/application/use-cases/reuse-stored-full-text';
import { searchScientificSources } from '@/lib/application/use-cases/search-scientific-sources';
import { methodologyRelease } from '@/lib/domain';
import type { FullTextCoverage, ResearchPlanningTrace, ScientificSourceCandidate, SourceDocumentCoverage } from '@/lib/domain';
import { D1AuditEventStore } from '@/lib/infrastructure/d1/d1-audit-event-store';
import { D1ModelRunStore } from '@/lib/infrastructure/d1/d1-model-run-store';
import { D1SourceDocumentStore } from '@/lib/infrastructure/d1/d1-source-document-store';
import { D1SourceIntakeDecisionStore } from '@/lib/infrastructure/d1/d1-source-intake-decision-store';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { D1ResearchRunStore } from '@/lib/infrastructure/d1/d1-research-run-store';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { CrossrefSearch } from '@/lib/infrastructure/scientific/crossref-search';
import { PmcOpenAccessLoader } from '@/lib/infrastructure/scientific/pmc-open-access-loader';
import { PubmedDocumentLoader } from '@/lib/infrastructure/scientific/pubmed-document-loader';
import { PubmedSearch } from '@/lib/infrastructure/scientific/pubmed-search';
import { createLlmRuntime } from '@/lib/infrastructure/llm/create-llm-runtime';

interface ResearchRequestBody {
  query?: unknown;
}

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

function requestQuery(body: ResearchRequestBody): string | null {
  if (typeof body.query !== 'string') return null;
  const query = body.query.trim();
  return query.length >= 3 && query.length <= 500 ? query : null;
}

function reportResearchFailure(error: unknown): void {
  console.error('research_run_failed', error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: 'UnknownError' });
}

function safeFailureDetail(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown_error';
  return error.message
    .replace(/'[^']*'/g, "'<redacted>'")
    .replace(/\b\d{4,}\b/g, '<number>')
    .slice(0, 240);
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

async function capturePubmedDocuments(
  candidates: ScientificSourceCandidate[],
  store: D1SourceDocumentStore,
  runtime: ReturnType<typeof bindings>,
): Promise<SourceDocumentCoverage> {
  const ids = candidates.flatMap((candidate) => candidate.pmid ? [candidate.pmid] : []);
  try {
    return await ingestSourceDocuments(ids, {
      loader: new PubmedDocumentLoader({
        apiKey: runtime.PUBMED_API_KEY as string,
        email: runtime.NCBI_EMAIL as string,
      }),
      store,
    });
  } catch {
    return {
      requested: ids.length, fetched: 0, stored: 0, abstractOnly: 0,
      rejected: 0, unavailable: ids.length, decisions: [],
    };
  }
}

async function capturePmcFullText(
  coverage: SourceDocumentCoverage,
  store: D1SourceDocumentStore,
): Promise<FullTextCoverage> {
  const ids = coverage.decisions.flatMap((decision) =>
    decision.decision === 'admitted_to_triage' ? [decision.sourceId.replace('pmid:', '')] : []);
  try {
    return await ingestFullTextDocuments(ids, {
      loader: new PmcOpenAccessLoader(),
      store,
    });
  } catch {
    return { requested: ids.length, stored: 0, unavailable: ids.length, documents: [] };
  }
}

function completionWarnings(
  base: string[], documents: SourceDocumentCoverage, fullTexts: FullTextCoverage,
): string[] {
  const warnings = [...base];
  if (documents.unavailable > 0) warnings.push('Часть аннотаций PubMed не удалось сохранить.');
  if (documents.rejected > 0) warnings.push(`Intake-gate исключил ${documents.rejected} источников из исследовательского архива.`);
  if ((fullTexts.reused ?? 0) > 0) warnings.push(`Повторно использовано ${fullTexts.reused} ранее сохранённых полных текстов.`);
  return warnings;
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as ResearchRequestBody;
  const query = requestQuery(body);
  if (!query) {
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
  let failureStage = 'schema';
  try {
    await ensureResearchSchema(runtime.DB);
    await ensureEvidenceSchema(runtime.DB);
    await ensurePipelineSchema(runtime.DB);
    const sourceDocumentStore = new D1SourceDocumentStore(runtime.DB);
    failureStage = 'planning';
    const runId = crypto.randomUUID();
    const planning = await planResearch(query, runId, createLlmRuntime(runtime));
    failureStage = 'search';
    const result = await searchScientificSources(query, 10, {
      searches,
      retrievalQuery: planning.trace.searchQuery,
      fallbackRetrievalQuery: buildScientificQuery(query),
      retrievalFocus: planning.trace.draft ? {
        question: planning.trace.draft.normalizedQuestion,
        population: planning.trace.draft.population,
        intervention: planning.trace.draft.intervention,
        comparator: planning.trace.draft.comparator,
        outcomes: planning.trace.draft.outcomes,
      } : { question: buildScientificQuery(query) },
      createId: () => runId,
    });
    const discovered = { ...result, planning: planning.trace };
    failureStage = 'research_persistence';
    await new D1ResearchRunStore(runtime.DB).saveSearch(discovered);
    failureStage = 'document_ingestion';
    const documentCoverage = await capturePubmedDocuments(result.candidates, sourceDocumentStore, runtime);
    await new D1SourceIntakeDecisionStore(runtime.DB).saveAll(runId, documentCoverage.decisions);
    failureStage = 'full_text_ingestion';
    const downloadedFullTextCoverage = await capturePmcFullText(documentCoverage, sourceDocumentStore);
    const admittedSourceIds = documentCoverage.decisions.flatMap((decision) =>
      decision.decision === 'admitted_to_triage' ? [decision.sourceId] : []);
    const fullTextCoverage = await reuseStoredFullText(admittedSourceIds, downloadedFullTextCoverage, sourceDocumentStore);
    const completed = {
      ...discovered,
      documentCoverage,
      fullTextCoverage,
      warnings: completionWarnings(discovered.warnings, documentCoverage, fullTextCoverage),
    };
    failureStage = 'model_run_persistence';
    if (planning.modelRun) await new D1ModelRunStore(runtime.DB).save(planning.modelRun);
    failureStage = 'audit_persistence';
    await new D1AuditEventStore(runtime.DB).save({
      id: crypto.randomUUID(), aggregateType: 'research_run', aggregateId: runId,
      eventType: 'research_planning_completed',
      actorType: planning.trace.mode === 'model_draft' ? 'model' : 'system',
      payload: {
        planningMode: planning.trace.mode, promptVersion: planning.trace.promptVersion,
        modelRunId: planning.modelRun?.runId, methodologyVersion: methodologyRelease.version,
        automaticClaimApprovalEnabled: methodologyRelease.automatedClaimApprovalEnabled,
        documentCoverage,
        fullTextCoverage,
      },
      occurredAt: result.completedAt,
    });
    return Response.json(completed);
  } catch (error) {
    reportResearchFailure(error);
    return Response.json({
      error: 'Не удалось сохранить исследовательский запуск. Попробуйте ещё раз.',
      failureStage,
      failureDetail: safeFailureDetail(error),
    }, { status: 503 });
  }
}
