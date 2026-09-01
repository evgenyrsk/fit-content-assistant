import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenRouterProvider } from './openrouter-provider.ts';

test('OpenRouter adapter enforces supported parameters and economical routing', async () => {
  let requestBody: Record<string, unknown> = {};
  const provider = new OpenRouterProvider({
    apiKey: 'test-only', baseUrl: 'https://openrouter.ai/api/v1',
    capabilities: { content: ['structured_output'] },
    fetcher: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ id: 'gen_1', model: 'content', provider: 'example', choices: [{ message: { content: '{"title":"Draft"}' } }], usage: { prompt_tokens: 8, completion_tokens: 3, cost: 0.001 } });
    },
  });
  const result = await provider.generateStructured<{ title: string }>({
    model: 'content', system: 'System', input: 'Input', schemaName: 'draft',
    outputSchema: { type: 'object' }, maxOutputTokens: 100,
    metadata: { runId: 'run-1', stage: 'platform_draft', promptVersion: '1' },
  });
  const routing = requestBody.provider as { sort: string; require_parameters: boolean; data_collection: string; zdr: boolean };
  assert.deepEqual(result.output, { title: 'Draft' });
  assert.equal(routing.sort, 'price');
  assert.equal(routing.require_parameters, true);
  assert.equal(routing.data_collection, 'deny');
  assert.equal(routing.zdr, true);
  assert.equal(result.costUsd, 0.001);
});
