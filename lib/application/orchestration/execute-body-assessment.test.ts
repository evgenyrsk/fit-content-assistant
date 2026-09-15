import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmProvider } from '../ports/llm-provider.ts';
import { executeBodyAssessment } from './execute-body-assessment.ts';
import { eligibleSummary, validBodyAssessmentDraft } from './body-assessment.fixture.ts';

function provider(output: unknown): LlmProvider {
  return {
    id: 'openrouter', supports: () => true,
    async generateStructured<T>() {
      return { output: output as T, provider: 'openrouter', model: 'research', requestId: 'request-1' };
    },
  };
}

test('creates only a review-required body draft before calibration', async () => {
  const result = await executeBodyAssessment('Does creatine improve strength?', 'strength', [eligibleSummary], {
    provider: provider(validBodyAssessmentDraft()), model: 'research', budgetProfile: 'economy',
    researchRunId: 'research-1', methodologyVersion: '0.2.0-draft', methodologyCalibrated: false,
    createId: () => 'model-run-1', now: () => new Date('2026-08-27T00:00:00.000Z'),
  });
  assert.equal(result.status, 'model_draft');
  assert.equal(result.body?.gate.decision, 'needs_human_review');
  assert.ok(result.body?.gate.reasons.includes('human_confirmation_required'));
  assert.ok(result.body?.gate.reasons.includes('methodology_not_calibrated'));
});

test('rejects an invented source assessment id', async () => {
  const draft = { ...validBodyAssessmentDraft(), eligibleStudyAssessmentIds: ['invented'] };
  const result = await executeBodyAssessment('question', 'strength', [eligibleSummary], {
    provider: provider(draft), model: 'research', budgetProfile: 'economy',
    researchRunId: 'research-1', methodologyVersion: '0.2.0-draft', methodologyCalibrated: false,
  });
  assert.equal(result.status, 'needs_review');
  assert.equal(result.body, null);
});

test('retries a malformed body draft once with repair guidance', async () => {
  let calls = 0;
  const fake = provider(validBodyAssessmentDraft());
  fake.generateStructured = async <T>() => {
    calls += 1;
    const output = calls === 1
      ? { ...validBodyAssessmentDraft(), domains: validBodyAssessmentDraft().domains.slice(1) }
      : validBodyAssessmentDraft();
    return { output: output as T, provider: 'openrouter', model: 'research', requestId: `request-${calls}` };
  };
  const result = await executeBodyAssessment('question', 'strength', [eligibleSummary], {
    provider: fake, model: 'research', budgetProfile: 'economy',
    researchRunId: 'research-1', methodologyVersion: '0.2.0-draft', methodologyCalibrated: false,
  });
  assert.equal(result.status, 'model_draft');
  assert.equal(calls, 2);
  assert.deepEqual(result.modelRun.toolCalls, ['structured_output_retry']);
});

test('does not call a model without eligible source assessments', async () => {
  let called = false;
  const fake = provider(validBodyAssessmentDraft());
  fake.generateStructured = async () => { called = true; throw new Error('must not run'); };
  const ineligible = { ...eligibleSummary, decision: 'needs_human_review' as const };
  const result = await executeBodyAssessment('question', 'strength', [ineligible], {
    provider: fake, model: 'research', budgetProfile: 'economy',
    researchRunId: 'research-1', methodologyVersion: '0.2.0-draft', methodologyCalibrated: false,
  });
  assert.equal(called, false);
  assert.equal(result.status, 'needs_review');
});
