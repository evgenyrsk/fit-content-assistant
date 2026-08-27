import type { LlmProvider, LlmProviderId } from '../../application/ports/llm-provider.ts';
import type { BudgetProfile } from '../../application/orchestration/pipeline-budget.ts';
import { OpenAiProvider } from './openai-provider.ts';
import { OpenRouterProvider } from './openrouter-provider.ts';

export interface LlmRuntime {
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
}

type RuntimeBindings = Record<string, string | unknown | undefined>;

function budgetProfile(value: unknown): BudgetProfile {
  return value === 'balanced' ? 'balanced' : 'economy';
}

function configuredModel(bindings: RuntimeBindings, provider: LlmProviderId): string {
  const providerModel = provider === 'openrouter' ? bindings.OPENROUTER_MODEL_RESEARCH : bindings.OPENAI_MODEL_RESEARCH;
  const configuredModel = bindings.LLM_RESEARCH_MODEL ?? providerModel;
  return typeof configuredModel === 'string' ? configuredModel.trim() : '';
}

function openAiRuntime(bindings: RuntimeBindings, model: string): LlmRuntime | null {
  if (typeof bindings.OPENAI_API_KEY !== 'string') return null;
  const capabilities = { [model]: ['structured_output' as const] };
  return {
    provider: new OpenAiProvider({ apiKey: bindings.OPENAI_API_KEY, capabilities }),
    model, budgetProfile: budgetProfile(bindings.LLM_BUDGET_PROFILE),
  };
}

function openRouterRuntime(bindings: RuntimeBindings, model: string): LlmRuntime | null {
  if (typeof bindings.OPENROUTER_API_KEY !== 'string') return null;
  const capabilities = { [model]: ['structured_output' as const] };
  const baseUrl = typeof bindings.OPENROUTER_BASE_URL === 'string'
    ? bindings.OPENROUTER_BASE_URL : 'https://openrouter.ai/api/v1';
  return {
    provider: new OpenRouterProvider({ apiKey: bindings.OPENROUTER_API_KEY, baseUrl, capabilities }),
    model, budgetProfile: budgetProfile(bindings.LLM_BUDGET_PROFILE),
  };
}

export function createLlmRuntime(bindings: RuntimeBindings): LlmRuntime | null {
  const provider = bindings.LLM_PROVIDER;
  if (provider !== 'openai' && provider !== 'openrouter') return null;
  const model = configuredModel(bindings, provider);
  if (!model) return null;
  return provider === 'openai' ? openAiRuntime(bindings, model) : openRouterRuntime(bindings, model);
}
