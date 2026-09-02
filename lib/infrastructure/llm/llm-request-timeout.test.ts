import assert from 'node:assert/strict';
import test from 'node:test';
import { llmRequestTimeoutMs } from './llm-request-timeout.ts';

test('allows bounded extra time only for scientific appraisal stages', () => {
  assert.equal(llmRequestTimeoutMs('source_assessment', 45_000), 120_000);
  assert.equal(llmRequestTimeoutMs('body_assessment', 60_000), 120_000);
  assert.equal(llmRequestTimeoutMs('research_plan', 45_000), 45_000);
  assert.equal(llmRequestTimeoutMs('platform_draft', 60_000), 60_000);
});
