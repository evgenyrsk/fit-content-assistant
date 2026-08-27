import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAiProvider } from './openai-provider.ts';

test('OpenAI adapter sends strict schema and records actual usage', async () => {
  let requestBody: Record<string, unknown> = {};
  const provider = new OpenAiProvider({
    apiKey: 'test-only',
    capabilities: { research: ['structured_output'] },
    fetcher: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ id: 'resp_1', model: 'research', output: [{ content: [{ type: 'output_text', text: '{"decision":"needs_review"}' }] }], usage: { input_tokens: 10, output_tokens: 4 } });
    },
  });
  const result = await provider.generateStructured<{ decision: string }>({
    model: 'research', system: 'System', input: 'Input', schemaName: 'decision',
    outputSchema: { type: 'object' }, maxOutputTokens: 100,
    metadata: { runId: 'run-1', stage: 'claim_review', promptVersion: '1' },
  });
  assert.deepEqual(result.output, { decision: 'needs_review' });
  assert.equal((requestBody.text as { format: { strict: boolean } }).format.strict, true);
  assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 4 });
});
