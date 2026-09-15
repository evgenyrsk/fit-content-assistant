import type { LlmProvider } from '../ports/llm-provider.ts';
import type { ModelRunRecord } from './model-run.ts';
import type { BudgetProfile } from './pipeline-budget.ts';
import { stageBudget } from './pipeline-budget.ts';
import type { ContentPipelineStage } from '../../domain/index.ts';

interface ContentStageOptions<T> {
  stage: ContentPipelineStage;
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
  contentItemId: string;
  prompt: { version: string; system: string };
  input: unknown;
  schemaName: string;
  outputSchema: Record<string, unknown>;
  retrievedIds: string[];
  validate: (value: unknown) => T;
  now?: () => Date;
  createId?: () => string;
}

export interface ContentStageExecution<T> {
  output: T | null;
  modelRun: ModelRunRecord;
}

export async function executeStructuredContentStage<T>(options: ContentStageOptions<T>): Promise<ContentStageExecution<T>> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const base: ModelRunRecord = {
    runId: (options.createId ?? (() => crypto.randomUUID()))(), contentItemId: options.contentItemId,
    stage: options.stage, provider: options.provider.id, model: options.model,
    promptVersion: options.prompt.version, startedAt, completedAt: startedAt,
    retrievedIds: options.retrievedIds, toolCalls: [], decision: 'needs_review',
  };
  if (!options.provider.supports('structured_output', options.model)) return { output: null, modelRun: base };
  let retried = false;
  try {
    const budget = stageBudget(options.stage, options.budgetProfile);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const repair = attempt === 0 ? '' : ' The previous output was rejected. Recreate the complete JSON from scratch with no extra keys, preserve every required caveat verbatim, and link every factual fragment only to the supplied claim IDs.';
        const result = await options.provider.generateStructured<unknown>({
          model: options.model, system: `${options.prompt.system}${repair}`, input: JSON.stringify(options.input),
          schemaName: options.schemaName, outputSchema: options.outputSchema,
          maxOutputTokens: budget.maxOutputTokens, maxToolCalls: 0,
          metadata: { runId: options.contentItemId, stage: options.stage, promptVersion: options.prompt.version },
        });
        const output = options.validate(result.output);
        return { output, modelRun: {
          ...base, provider: result.provider, model: result.model, routedProvider: result.routedProvider,
          completedAt: clock().toISOString(), decision: 'approved',
          inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens,
          costUsd: result.costUsd, toolCalls: retried ? ['structured_output_retry'] : [],
        } };
      } catch (error) {
        if (attempt === 0) { retried = true; continue; }
        throw error;
      }
    }
    throw new Error('Content stage retry exhausted.');
  } catch {
    return { output: null, modelRun: { ...base, completedAt: clock().toISOString(), toolCalls: retried ? ['structured_output_retry'] : [] } };
  }
}
