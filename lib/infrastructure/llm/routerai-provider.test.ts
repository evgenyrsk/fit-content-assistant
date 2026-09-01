import assert from 'node:assert/strict';
import test from 'node:test';
import { RouterAiProvider } from './routerai-provider.ts';

test('RouterAI adapter requests strict structured output through its compatible API', async () => {
  let requestBody: Record<string, unknown> = {};
  const provider = new RouterAiProvider({
    apiKey: 'test-only', baseUrl: 'https://routerai.ru/api/v1',
    capabilities: { content: ['structured_output'] },
    fetcher: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        id: 'generation-1', model: 'content', provider: 'google',
        choices: [{ message: { content: '{"title":"Draft"}' } }],
        usage: { prompt_tokens: 8, completion_tokens: 3, cost: 0.12 },
      });
    },
  });
  const result = await provider.generateStructured<{ title: string }>({
    model: 'content', system: 'System', input: 'Input', schemaName: 'draft',
    outputSchema: { type: 'object' }, maxOutputTokens: 100,
    metadata: { runId: 'run-1', stage: 'platform_draft', promptVersion: '1' },
  });
  const format = requestBody.response_format as { type: string; json_schema: { strict: boolean } };
  assert.deepEqual(result.output, { title: 'Draft' });
  assert.equal(requestBody.structured_outputs, true);
  assert.equal(format.type, 'json_schema');
  assert.equal(format.json_schema.strict, true);
  assert.equal(result.routedProvider, 'google');
  assert.equal(result.costUsd, undefined);
});
