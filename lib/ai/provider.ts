export type LlmProviderId = 'openai' | 'openrouter';

export type LlmCapability =
  | 'structured_output'
  | 'streaming'
  | 'tool_calling'
  | 'reasoning';

export interface LlmToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmExecutionRequest {
  model: string;
  system: string;
  input: string;
  schemaName: string;
  outputSchema: Record<string, unknown>;
  tools?: LlmToolDefinition[];
  metadata: {
    runId: string;
    stage: string;
    promptVersion: string;
  };
}

export interface LlmExecutionResult<T> {
  output: T;
  provider: LlmProviderId;
  model: string;
  routedProvider?: string;
  requestId: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Provider-neutral boundary used by the domain pipeline. Retrieval, evidence
 * assessment and release gates stay in Forme and never depend on a vendor SDK.
 */
export interface LlmProvider {
  readonly id: LlmProviderId;
  supports(capability: LlmCapability, model: string): boolean;
  generateStructured<T>(request: LlmExecutionRequest): Promise<LlmExecutionResult<T>>;
}
