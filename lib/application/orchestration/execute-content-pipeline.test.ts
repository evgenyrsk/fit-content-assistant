import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmExecutionRequest, LlmProvider } from '../ports/llm-provider.ts';
import { executeContentPipeline } from './execute-content-pipeline.ts';
import {
  approvedClaim, validContentBrief, validFactReview, validPlatformDraft, validVoiceEdit,
} from './content-pipeline.fixture.ts';

function provider(outputs: unknown[], model: string, requests: LlmExecutionRequest[]): LlmProvider {
  return {
    id: 'openrouter', supports: () => true,
    async generateStructured<T>(request: LlmExecutionRequest) {
      requests.push(request);
      return {
        output: outputs.shift() as T, provider: 'openrouter', model,
        routedProvider: 'test-route', requestId: `request-${requests.length}`,
        usage: { inputTokens: 20, outputTokens: 30 }, costUsd: 0.001,
      };
    },
  };
}

function ids() {
  let value = 0;
  return () => `id-${++value}`;
}

test('runs four isolated stages and returns a traceable human-review draft', async () => {
  const contentRequests: LlmExecutionRequest[] = [];
  const reviewRequests: LlmExecutionRequest[] = [];
  const execution = await executeContentPipeline({
    format: 'threads', audience: 'русскоязычные взрослые', claims: [approvedClaim],
    contentRuntime: {
      provider: provider([validContentBrief, validPlatformDraft, validVoiceEdit], 'content-model', contentRequests),
      model: 'content-model', budgetProfile: 'economy',
    },
    reviewRuntime: {
      provider: provider([validFactReview], 'review-model', reviewRequests),
      model: 'review-model', budgetProfile: 'economy',
    },
    createId: ids(), now: () => new Date('2026-08-28T12:00:00.000Z'),
  });

  assert.equal(execution.status, 'ready_for_human_review');
  assert.equal(execution.contentItem?.draft.reviewDecision, 'approved');
  assert.equal(execution.contentItem?.styleProfileFallback, false);
  assert.equal(execution.contentItem?.brief.styleProfileVersion, 'evgeny-style@1.1.0');
  assert.equal(execution.modelRuns.length, 4);
  assert.deepEqual(contentRequests.map((request) => request.schemaName), [
    'forme_content_brief', 'forme_platform_draft', 'forme_voice_edit',
  ]);
  assert.equal(reviewRequests[0].schemaName, 'forme_fact_review');
  assert.ok(execution.contentItem?.draft.fragments
    .filter((fragment) => fragment.kind === 'fact')
    .every((fragment) => fragment.claimVersionIds.length > 0));
});

test('stops before voice editing when platform provenance fails', async () => {
  const requests: LlmExecutionRequest[] = [];
  const brokenDraft = {
    ...validPlatformDraft,
    fragments: [{ ...validPlatformDraft.fragments[0], claimVersionIds: ['invented'] }],
  };
  const execution = await executeContentPipeline({
    format: 'reels', audience: 'взрослые', claims: [approvedClaim],
    contentRuntime: {
      provider: provider([validContentBrief, brokenDraft], 'content-model', requests),
      model: 'content-model', budgetProfile: 'economy',
    },
    reviewRuntime: {
      provider: provider([validFactReview], 'review-model', []),
      model: 'review-model', budgetProfile: 'economy',
    },
    createId: ids(),
  });

  assert.equal(execution.status, 'needs_review');
  assert.equal(execution.contentItem, null);
  assert.equal(execution.modelRuns.length, 2);
  assert.equal(execution.stages.find((stage) => stage.stage === 'platform_draft')?.status, 'blocked');
});
