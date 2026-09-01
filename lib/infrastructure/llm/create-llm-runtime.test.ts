import assert from 'node:assert/strict';
import test from 'node:test';
import { createLlmRuntime } from './create-llm-runtime.ts';

test('creates the selected OpenAI runtime without exposing provider details upstream', () => {
  const runtime = createLlmRuntime({
    LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'test-only', OPENAI_MODEL_RESEARCH: 'research-model',
  });
  assert.equal(runtime?.provider.id, 'openai');
  assert.equal(runtime?.model, 'research-model');
  assert.equal(runtime?.budgetProfile, 'economy');
});

test('creates an economical OpenRouter runtime from the same boundary', () => {
  const runtime = createLlmRuntime({
    LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'test-only',
    OPENROUTER_MODEL_RESEARCH: 'route/model', LLM_BUDGET_PROFILE: 'balanced',
  });
  assert.equal(runtime?.provider.id, 'openrouter');
  assert.equal(runtime?.model, 'route/model');
  assert.equal(runtime?.budgetProfile, 'balanced');
});

test('selects the content model without changing the provider boundary', () => {
  const runtime = createLlmRuntime({
    LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'test-only',
    OPENROUTER_MODEL_RESEARCH: 'route/research', OPENROUTER_MODEL_CONTENT: 'route/content',
  }, 'content');
  assert.equal(runtime?.provider.id, 'openrouter');
  assert.equal(runtime?.model, 'route/content');
});

test('creates a RouterAI runtime with the gateway privacy posture', () => {
  const runtime = createLlmRuntime({
    LLM_PROVIDER: 'routerai', ROUTERAI_API_KEY: 'test-only',
    ROUTERAI_MODEL_RESEARCH: 'openai/gpt-5-mini',
  });
  assert.equal(runtime?.provider.id, 'routerai');
  assert.equal(runtime?.model, 'openai/gpt-5-mini');
  assert.equal(runtime?.privacy, 'gateway_no_prompt_storage');
});

test('keeps the model stage disabled when configuration is incomplete', () => {
  assert.equal(createLlmRuntime({ LLM_PROVIDER: 'openai', OPENAI_MODEL_RESEARCH: 'research-model' }), null);
  assert.equal(createLlmRuntime({
    LLM_PROVIDER: 'openrouter', OPENROUTER_API_KEY: '   ', OPENROUTER_MODEL_RESEARCH: 'research-model',
  }), null);
  assert.equal(createLlmRuntime({
    LLM_PROVIDER: 'routerai', ROUTERAI_API_KEY: '', ROUTERAI_MODEL_RESEARCH: 'research-model',
  }), null);
});
