import type { LlmProvider, LlmProviderId } from '../../application/ports/llm-provider.ts';
import type { BudgetProfile, ModelRole } from '../../application/orchestration/pipeline-budget.ts';
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

function configuredModel(bindings: RuntimeBindings, provider: LlmProviderId, role: ModelRole): string {
  const providerModel = provider === 'openrouter'
    ? bindings[role === 'content' ? 'OPENROUTER_MODEL_CONTENT' : 'OPENROUTER_MODEL_RESEARCH']
    : bindings[role === 'content' ? 'OPENAI_MODEL_CONTENT' : 'OPENAI_MODEL_RESEARCH'];
  const configuredModel = bindings[role === 'content' ? 'LLM_CONTENT_MODEL' : 'LLM_RESEARCH_MODEL'] ?? providerModel;
  return typeof configuredModel === 'string' ? configuredModel.trim() : '';
}

function configuredSecret(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const secret = value.trim();
  return secret.length > 0 ? secret : null;
}

function openAiRuntime(bindings: RuntimeBindings, model: string): LlmRuntime | null {
  const apiKey = configuredSecret(bindings.OPENAI_API_KEY);
  if (!apiKey) return null;
  const capabilities = { [model]: ['structured_output' as const] };
  return {
    provider: new OpenAiProvider({ apiKey, capabilities }),
    model, budgetProfile: budgetProfile(bindings.LLM_BUDGET_PROFILE),
  };
}

function openRouterRuntime(bindings: RuntimeBindings, model: string): LlmRuntime | null {
  const apiKey = configuredSecret(bindings.OPENROUTER_API_KEY);
  if (!apiKey) return null;
  const capabilities = { [model]: ['structured_output' as const] };
  const baseUrl = typeof bindings.OPENROUTER_BASE_URL === 'string' && bindings.OPENROUTER_BASE_URL.trim()
    ? bindings.OPENROUTER_BASE_URL.trim() : 'https://openrouter.ai/api/v1';
  return {
    provider: new OpenRouterProvider({ apiKey, baseUrl, capabilities }),
    model, budgetProfile: budgetProfile(bindings.LLM_BUDGET_PROFILE),
  };
}

export function createLlmRuntime(bindings: RuntimeBindings, role: ModelRole = 'research'): LlmRuntime | null {
  const provider = bindings.LLM_PROVIDER;
  if (provider !== 'openai' && provider !== 'openrouter') return null;
  const model = configuredModel(bindings, provider, role);
  if (!model) return null;
  return provider === 'openai' ? openAiRuntime(bindings, model) : openRouterRuntime(bindings, model);
}
