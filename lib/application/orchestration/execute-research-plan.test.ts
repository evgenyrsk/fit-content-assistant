import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmExecutionRequest, LlmProvider } from '../ports/llm-provider.ts';
import { executeResearchPlan } from './execute-research-plan.ts';
import type { ResearchPlanDraft } from './research-plan-contract.ts';

const plan: ResearchPlanDraft = {
  normalizedQuestion: 'Влияет ли креатин на силу?', questionType: 'intervention_effect',
  population: 'взрослые', intervention: 'креатин', comparator: 'плацебо',
  outcomes: ['сила'], inclusionCriteria: ['RCT'], exclusionCriteria: ['нет исхода'],
  disconfirmingEvidence: ['адекватный нулевой эффект'], searchQuery: 'creatine AND strength', ambiguities: [],
};

function fakeProvider(output: unknown, supported = true, capture?: (request: LlmExecutionRequest) => void): LlmProvider {
  return {
    id: 'openrouter',
    supports: () => supported,
    async generateStructured<T>(request: LlmExecutionRequest) {
      capture?.(request);
      return {
        output: output as T, provider: 'openrouter', model: 'research-test',
        routedProvider: 'test-route', requestId: 'request-1',
        usage: { inputTokens: 21, outputTokens: 34 }, costUsd: 0.002,
      };
    },
  };
}

test('returns a validated draft and a complete model audit record', async () => {
  let request: LlmExecutionRequest | undefined;
  const result = await executeResearchPlan('креатин', {
    provider: fakeProvider(plan, true, (value) => { request = value; }),
    model: 'research-test', budgetProfile: 'economy', researchRunId: 'research-1',
    createId: () => 'model-run-1', now: () => new Date('2026-08-27T10:00:00.000Z'),
  });
  assert.equal(result.status, 'model_draft');
  assert.equal(result.plan?.searchQuery, plan.searchQuery);
  assert.equal(request?.schemaName, 'forme_research_plan');
  assert.equal(request?.maxToolCalls, 0);
  assert.deepEqual(result.modelRun, {
    runId: 'model-run-1', researchRunId: 'research-1', stage: 'research_plan',
    provider: 'openrouter', model: 'research-test', routedProvider: 'test-route',
    promptVersion: 'research-plan@0.1.0', startedAt: '2026-08-27T10:00:00.000Z',
    completedAt: '2026-08-27T10:00:00.000Z', retrievedIds: [], toolCalls: [],
    decision: 'needs_review', inputTokens: 21, outputTokens: 34, costUsd: 0.002,
  });
});

test('fails closed when structured output is invalid', async () => {
  const result = await executeResearchPlan('креатин', {
    provider: fakeProvider({ answer: 'yes' }), model: 'research-test',
    budgetProfile: 'economy', researchRunId: 'research-1', createId: () => 'run-1',
  });
  assert.equal(result.status, 'needs_review');
  assert.equal(result.plan, null);
  assert.equal(result.modelRun.decision, 'needs_review');
});

test('does not call a model without structured output capability', async () => {
  let called = false;
  const provider = fakeProvider(plan, false, () => { called = true; });
  const result = await executeResearchPlan('креатин', {
    provider, model: 'research-test', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(called, false);
  assert.equal(result.status, 'needs_review');
});
