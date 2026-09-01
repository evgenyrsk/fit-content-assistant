import type { LlmCapability, LlmExecutionRequest, LlmExecutionResult, LlmProvider } from '../../application/ports/llm-provider.ts';
import { parseJsonOutput, requireSuccessfulResponse } from './llm-response.ts';

type Fetcher = typeof fetch;

interface RouterAiProviderOptions {
  apiKey: string;
  baseUrl: string;
  capabilities: Record<string, LlmCapability[]>;
  fetcher?: Fetcher;
}

interface RouterAiResponse {
  id?: string;
  model?: string;
  provider?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function responseContent(payload: RouterAiResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('RouterAI response did not contain structured output.');
  return content;
}

export class RouterAiProvider implements LlmProvider {
  readonly id = 'routerai' as const;
  private readonly fetcher: Fetcher;
  private readonly options: RouterAiProviderOptions;

  constructor(options: RouterAiProviderOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
  }

  supports(capability: LlmCapability, model: string): boolean {
    return this.options.capabilities[model]?.includes(capability) ?? false;
  }

  async generateStructured<T>(request: LlmExecutionRequest): Promise<LlmExecutionResult<T>> {
    if (!this.supports('structured_output', request.model)) {
      throw new Error('Configured RouterAI route lacks structured output capability.');
    }
    const response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: AbortSignal.timeout(60_000),
      headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.input }],
        max_tokens: request.maxOutputTokens,
        structured_outputs: true,
        response_format: {
          type: 'json_schema',
          json_schema: { name: request.schemaName, strict: true, schema: request.outputSchema },
        },
        provider: { allow_fallbacks: true },
        tools: request.tools?.map((tool) => ({
          type: 'function',
          function: { name: tool.name, description: tool.description, parameters: tool.inputSchema, strict: true },
        })),
      }),
    });
    requireSuccessfulResponse(response, 'RouterAI');
    const payload = await response.json() as RouterAiResponse;
    return {
      output: parseJsonOutput<T>(responseContent(payload), 'RouterAI'), provider: this.id,
      model: payload.model ?? request.model, routedProvider: payload.provider,
      requestId: payload.id ?? 'unknown',
      usage: payload.usage ? {
        inputTokens: payload.usage.prompt_tokens ?? 0,
        outputTokens: payload.usage.completion_tokens ?? 0,
      } : undefined,
    };
  }
}
