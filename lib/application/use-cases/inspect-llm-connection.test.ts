import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmProvider } from '../ports/llm-provider.ts';
import { inspectLlmConnection } from './inspect-llm-connection.ts';

function runtime(role: string, succeeds = true) {
  const provider: LlmProvider = {
    id: 'openrouter', supports: () => true,
    async generateStructured<T>() {
      if (!succeeds) throw new Error('probe failed');
      return { output: { status: 'ok' } as T, provider: 'openrouter', model: role, requestId: role };
    },
  };
  return {
    provider, model: role, budgetProfile: 'economy' as const,
    privacy: 'zero_retention_required' as const,
  };
}

test('does not probe when a server secret is missing', async () => {
  const result = await inspectLlmConnection({
    provider: 'openrouter', researchRuntime: null, contentRuntime: null, reviewRuntime: null, liveProbe: true,
    now: () => new Date('2026-09-01T10:00:00.000Z'),
  });
  assert.equal(result.state, 'not_configured');
  assert.equal(result.liveProbe, false);
});

test('requires all three model routes to pass the strict live probe', async () => {
  const result = await inspectLlmConnection({
    provider: 'openrouter', researchRuntime: runtime('research'), contentRuntime: runtime('content'),
    reviewRuntime: runtime('review'), liveProbe: true,
  });
  assert.equal(result.state, 'connected');
  assert.equal(result.privacy, 'zero_retention_required');
});

test('fails closed when one model route is unavailable', async () => {
  const result = await inspectLlmConnection({
    provider: 'openrouter', researchRuntime: runtime('research'), contentRuntime: runtime('content', false),
    reviewRuntime: runtime('review'), liveProbe: true,
  });
  assert.equal(result.state, 'attention_required');
  assert.match(result.detail, /Content/);
});

test('reports RouterAI gateway privacy without claiming ZDR', async () => {
  const routerAiRuntime = {
    ...runtime('research'),
    provider: { ...runtime('research').provider, id: 'routerai' as const },
    privacy: 'gateway_no_prompt_storage' as const,
  };
  const result = await inspectLlmConnection({
    provider: 'routerai', researchRuntime: routerAiRuntime,
    contentRuntime: { ...routerAiRuntime, model: 'content' },
    reviewRuntime: { ...routerAiRuntime, model: 'review' }, liveProbe: false,
  });
  assert.equal(result.privacy, 'gateway_no_prompt_storage');
});
