import type { LlmCapability, LlmExecutionRequest, LlmExecutionResult, LlmProvider } from '../../application/ports/llm-provider.ts';
import { parseJsonOutput, requireSuccessfulResponse } from './llm-response.ts';

type Fetcher = typeof fetch;

interface OpenRouterProviderOptions {
  apiKey: string;
  baseUrl: string;
  capabilities: Record<string, LlmCapability[]>;
  fetcher?: Fetcher;
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  provider?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

function responseContent(payload: OpenRouterResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter response did not contain structured output.');
  return content;
}

function responseUsage(payload: OpenRouterResponse): { inputTokens: number; outputTokens: number } | undefined {
  if (!payload.usage) return undefined;
  return { inputTokens: payload.usage.prompt_tokens ?? 0, outputTokens: payload.usage.completion_tokens ?? 0 };
}

function mapResponse<T>(payload: OpenRouterResponse, requestedModel: string): LlmExecutionResult<T> {
  return {
    output: parseJsonOutput<T>(responseContent(payload), 'OpenRouter'),
    provider: 'openrouter',
    model: payload.model ?? requestedModel,
    routedProvider: payload.provider,
    requestId: payload.id ?? 'unknown',
    usage: responseUsage(payload),
    costUsd: payload.usage?.cost,
  };
}

export class OpenRouterProvider implements LlmProvider {
  readonly id = 'openrouter' as const;
  private readonly fetcher: Fetcher;
  private readonly options: OpenRouterProviderOptions;

  constructor(options: OpenRouterProviderOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
  }

  supports(capability: LlmCapability, model: string): boolean {
    return this.options.capabilities[model]?.includes(capability) ?? false;
  }

  async generateStructured<T>(request: LlmExecutionRequest): Promise<LlmExecutionResult<T>> {
    if (!this.supports('structured_output', request.model)) throw new Error('Configured OpenRouter route lacks structured output capability.');
    const response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(45_000),
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Metadata': 'enabled',
      },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.input }],
        max_tokens: request.maxOutputTokens,
        response_format: { type: 'json_schema', json_schema: { name: request.schemaName, strict: true, schema: request.outputSchema } },
        provider: {
          sort: 'price', require_parameters: true, allow_fallbacks: true,
          data_collection: 'deny', zdr: true,
        },
        tools: request.tools?.map((tool) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.inputSchema, strict: true } })),
      }),
    });
    requireSuccessfulResponse(response, 'OpenRouter');
    const payload = await response.json() as OpenRouterResponse;
    return mapResponse<T>(payload, request.model);
  }
}
