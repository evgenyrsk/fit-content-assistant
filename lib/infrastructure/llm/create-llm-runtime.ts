import type { LlmProvider, LlmProviderId } from '../../application/ports/llm-provider.ts';
import type { BudgetProfile, ModelRole } from '../../application/orchestration/pipeline-budget.ts';
import { OpenAiProvider } from './openai-provider.ts';
import { OpenRouterProvider } from './openrouter-provider.ts';
import { RouterAiProvider } from './routerai-provider.ts';

export interface LlmRuntime {
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
  privacy: 'zero_retention_required' | 'gateway_no_prompt_storage';
}

type RuntimeBindings = Record<string, string | unknown | undefined>;

function budgetProfile(value: unknown): BudgetProfile {
  return value === 'balanced' ? 'balanced' : 'economy';
}

function modelKey(provider: LlmProviderId, role: ModelRole): string {
  const suffix = role === 'content' ? 'CONTENT' : 'RESEARCH';
  return `${provider.toUpperCase()}_MODEL_${suffix}`;
}

function configuredModel(bindings: RuntimeBindings, provider: LlmProviderId, role: ModelRole): string {
  const providerModel = bindings[modelKey(provider, role)];
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
    model, budgetProfile: budgetProfile(bindings.LLM_BUDGET_PROFILE), privacy: 'zero_retention_required',
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
    model, budgetProfile: budgetProfile(bindings.LLM_BUDGET_PROFILE), privacy: 'zero_retention_required',
  };
}

function routerAiRuntime(bindings: RuntimeBindings, model: string): LlmRuntime | null {
  const apiKey = configuredSecret(bindings.ROUTERAI_API_KEY);
  if (!apiKey) return null;
  const capabilities = { [model]: ['structured_output' as const] };
  const baseUrl = typeof bindings.ROUTERAI_BASE_URL === 'string' && bindings.ROUTERAI_BASE_URL.trim()
    ? bindings.ROUTERAI_BASE_URL.trim() : 'https://routerai.ru/api/v1';
  return {
    provider: new RouterAiProvider({ apiKey, baseUrl, capabilities }),
    model, budgetProfile: budgetProfile(bindings.LLM_BUDGET_PROFILE), privacy: 'gateway_no_prompt_storage',
  };
}

export function createLlmRuntime(bindings: RuntimeBindings, role: ModelRole = 'research'): LlmRuntime | null {
  const provider = bindings.LLM_PROVIDER;
  if (provider !== 'openai' && provider !== 'openrouter' && provider !== 'routerai') return null;
  const model = configuredModel(bindings, provider, role);
  if (!model) return null;
  if (provider === 'openai') return openAiRuntime(bindings, model);
  return provider === 'openrouter' ? openRouterRuntime(bindings, model) : routerAiRuntime(bindings, model);
}
