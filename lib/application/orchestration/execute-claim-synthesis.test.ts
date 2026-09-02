import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmProvider } from '../ports/llm-provider.ts';
import { executeClaimSynthesis } from './execute-claim-synthesis.ts';
import { eligibleSummary } from './body-assessment.fixture.ts';
import { readyBody, validClaimSynthesisDraft } from './claim-synthesis.fixture.ts';

function provider(output: unknown): LlmProvider {
  return {
    id: 'openai', supports: () => true,
    async generateStructured<T>() {
      return { output: output as T, provider: 'openai', model: 'research', requestId: 'request-1' };
    },
  };
}

test('creates a traceable needs-review claim after a ready body gate', async () => {
  const result = await executeClaimSynthesis(readyBody, [eligibleSummary], {
    provider: provider(validClaimSynthesisDraft()), model: 'research', budgetProfile: 'economy',
    researchRunId: 'research-1', createId: () => 'model-run-1',
    now: () => new Date('2026-08-27T00:00:00.000Z'),
  });
  assert.equal(result.status, 'model_draft');
  assert.equal(result.claim?.status, 'needs_review');
  assert.equal(result.claim?.confidence, 'moderate');
  assert.equal(result.claim?.evidence[0].sourceChunkId, 'chunk-1');
});

test('does not call the model before the body gate is ready', async () => {
  let called = false;
  const fake = provider(validClaimSynthesisDraft());
  fake.generateStructured = async () => { called = true; throw new Error('must not run'); };
  const blockedBody = {
    ...readyBody,
    assessment: { ...readyBody.assessment, humanReview: 'pending' as const },
    gate: { decision: 'needs_human_review' as const, reasons: ['human_confirmation_required' as const] },
  };
  const result = await executeClaimSynthesis(blockedBody, [eligibleSummary], {
    provider: fake, model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(called, false);
  assert.equal(result.claim, null);
});

test('creates only a review draft when methodology is not calibrated but the body is confirmed', async () => {
  const uncalibratedBody = {
    ...readyBody,
    gate: { decision: 'needs_human_review' as const, reasons: ['methodology_not_calibrated' as const] },
  };
  const result = await executeClaimSynthesis(uncalibratedBody, [eligibleSummary], {
    provider: provider(validClaimSynthesisDraft()), model: 'research', budgetProfile: 'economy',
    researchRunId: 'research-1', now: () => new Date('2026-08-27T00:00:00.000Z'),
  });
  assert.equal(result.claim?.status, 'needs_review');
  assert.equal(result.modelRun.decision, 'needs_review');
});

test('rejects confidence stronger than the body or an invented passage', async () => {
  const tooStrong = { ...validClaimSynthesisDraft(), confidence: 'high' as const };
  const highResult = await executeClaimSynthesis(readyBody, [eligibleSummary], {
    provider: provider(tooStrong), model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(highResult.claim, null);
  const draft = validClaimSynthesisDraft();
  draft.evidence[0].sourceChunkId = 'invented';
  const citationResult = await executeClaimSynthesis(readyBody, [eligibleSummary], {
    provider: provider(draft), model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(citationResult.claim, null);
});
