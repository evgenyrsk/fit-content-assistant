import type { LlmProvider } from '../ports/llm-provider.ts';
import type { ModelRunRecord } from './model-run.ts';
import { stageBudget, type BudgetProfile } from './pipeline-budget.ts';
import { researchPlanSchema, validateResearchPlan, type ResearchPlanDraft } from './research-plan-contract.ts';
import { researchPlanPrompt } from './research-plan-prompt.ts';

export interface ResearchPlanExecutionOptions {
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
  researchRunId: string;
  now?: () => Date;
  createId?: () => string;
}

export interface ResearchPlanExecution {
  status: 'model_draft' | 'needs_review';
  plan: ResearchPlanDraft | null;
  modelRun: ModelRunRecord;
}

function baseRecord(options: ResearchPlanExecutionOptions, startedAt: string): ModelRunRecord {
  return {
    runId: (options.createId ?? (() => crypto.randomUUID()))(),
    researchRunId: options.researchRunId,
    stage: 'research_plan',
    provider: options.provider.id,
    model: options.model,
    promptVersion: researchPlanPrompt.version,
    startedAt,
    completedAt: startedAt,
    retrievedIds: [],
    toolCalls: [],
    decision: 'needs_review',
  };
}

export async function executeResearchPlan(query: string, options: ResearchPlanExecutionOptions): Promise<ResearchPlanExecution> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const modelRun = baseRecord(options, startedAt);
  if (!options.provider.supports('structured_output', options.model)) return { status: 'needs_review', plan: null, modelRun };
  const budget = stageBudget('research_plan', options.budgetProfile);
  try {
    const result = await options.provider.generateStructured<unknown>({
      model: options.model,
      system: researchPlanPrompt.system,
      input: query,
      schemaName: 'forme_research_plan',
      outputSchema: researchPlanSchema,
      maxOutputTokens: budget.maxOutputTokens,
      maxToolCalls: 0,
      metadata: { runId: options.researchRunId, stage: 'research_plan', promptVersion: researchPlanPrompt.version },
    });
    const plan = validateResearchPlan(result.output);
    return {
      status: 'model_draft',
      plan,
      modelRun: {
        ...modelRun,
        provider: result.provider,
        model: result.model,
        routedProvider: result.routedProvider,
        completedAt: clock().toISOString(),
        decision: 'needs_review',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        costUsd: result.costUsd,
      },
    };
  } catch {
    return { status: 'needs_review', plan: null, modelRun: { ...modelRun, completedAt: clock().toISOString() } };
  }
}
