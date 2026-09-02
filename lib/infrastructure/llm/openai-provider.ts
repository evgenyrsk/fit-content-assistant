import type { LlmCapability, LlmExecutionRequest, LlmExecutionResult, LlmProvider } from '../../application/ports/llm-provider.ts';
import { parseJsonOutput, requireSuccessfulResponse } from './llm-response.ts';
import { llmRequestTimeoutMs } from './llm-request-timeout.ts';

type Fetcher = typeof fetch;

interface OpenAiProviderOptions {
  apiKey: string;
  capabilities: Record<string, LlmCapability[]>;
  fetcher?: Fetcher;
}

interface OpenAiResponse {
  id?: string;
  model?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function outputText(response: OpenAiResponse): string {
  for (const item of response.output ?? []) {
    const content = item.content?.find((part) => part.type === 'output_text' && part.text);
    if (content?.text) return content.text;
  }
  throw new Error('OpenAI response did not contain structured output.');
}

export class OpenAiProvider implements LlmProvider {
  readonly id = 'openai' as const;
  private readonly fetcher: Fetcher;
  private readonly options: OpenAiProviderOptions;

  constructor(options: OpenAiProviderOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
  }

  supports(capability: LlmCapability, model: string): boolean {
    return this.options.capabilities[model]?.includes(capability) ?? false;
  }

  async generateStructured<T>(request: LlmExecutionRequest): Promise<LlmExecutionResult<T>> {
    if (!this.supports('structured_output', request.model)) throw new Error('Configured OpenAI model lacks structured output capability.');
    const response = await this.fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: AbortSignal.timeout(llmRequestTimeoutMs(request.metadata.stage, 45_000)),
      headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        instructions: request.system,
        input: request.input,
        store: false,
        max_output_tokens: request.maxOutputTokens,
        max_tool_calls: request.maxToolCalls,
        metadata: request.metadata,
        text: { format: { type: 'json_schema', name: request.schemaName, schema: request.outputSchema, strict: true } },
        tools: request.tools?.map((tool) => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.inputSchema, strict: true })),
      }),
    });
    requireSuccessfulResponse(response, 'OpenAI');
    const payload = await response.json() as OpenAiResponse;
    return {
      output: parseJsonOutput<T>(outputText(payload), 'OpenAI'),
      provider: this.id,
      model: payload.model ?? request.model,
      requestId: payload.id ?? 'unknown',
      usage: payload.usage ? { inputTokens: payload.usage.input_tokens ?? 0, outputTokens: payload.usage.output_tokens ?? 0 } : undefined,
    };
  }
}
