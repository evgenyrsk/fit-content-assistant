import { env } from 'cloudflare:workers';
import { inspectLlmConnection } from '@/lib/application/use-cases/inspect-llm-connection';
import { createLlmRuntime } from '@/lib/infrastructure/llm/create-llm-runtime';

type RuntimeBindings = Record<string, string | unknown | undefined>;

function bindings(): RuntimeBindings {
  return env as unknown as RuntimeBindings;
}

async function inspect(liveProbe: boolean): Promise<Response> {
  const runtime = bindings();
  const result = await inspectLlmConnection({
    provider: runtime.LLM_PROVIDER,
    researchRuntime: createLlmRuntime(runtime, 'research'),
    contentRuntime: createLlmRuntime(runtime, 'content'),
    liveProbe,
  });
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(): Promise<Response> {
  return inspect(false);
}

export async function POST(): Promise<Response> {
  return inspect(true);
}
