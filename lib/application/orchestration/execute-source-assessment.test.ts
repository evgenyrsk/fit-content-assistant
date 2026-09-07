import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmExecutionRequest, LlmProvider } from '../ports/llm-provider.ts';
import type { ScientificSourceDocument } from '../../domain/source-document.ts';
import { executeSourceAssessment } from './execute-source-assessment.ts';
import { validSourceAssessmentDraft } from './source-assessment.fixture.ts';

function document(contentLevel: ScientificSourceDocument['contentLevel'] = 'abstract_only'): ScientificSourceDocument {
  return {
    sourceId: 'pmid:123', provider: 'pubmed', externalId: '123', pmid: '123',
    title: 'Creatine and strength', publicationTypes: ['Randomized Controlled Trial'],
    recordStatus: 'active', contentLevel,
    chunks: [{ id: 'chunk-1', sourceId: 'pmid:123', kind: 'abstract', locator: 'abstract:results', text: 'Strength increased.' }],
    fetchedAt: '2026-08-27T00:00:00.000Z',
  };
}

function provider(output: unknown): LlmProvider {
  return {
    id: 'openai', supports: () => true,
    async generateStructured<T>() {
      return { output: output as T, provider: 'openai', model: 'research', requestId: 'request-1' };
    },
  };
}

test('abstract-only evidence always remains in human review', async () => {
  const result = await executeSourceAssessment('Does creatine improve strength?', document(), {
    provider: provider(validSourceAssessmentDraft()), model: 'research', budgetProfile: 'economy',
    researchRunId: 'research-1', createId: () => 'model-run-1',
    now: () => new Date('2026-08-27T00:00:00.000Z'),
  });
  assert.equal(result.status, 'model_draft');
  assert.equal(result.assessment?.gate.decision, 'needs_human_review');
  assert.ok(result.assessment?.gate.reasons.includes('incomplete_provenance'));
  assert.deepEqual(result.assessment?.finding.provenanceIds, ['chunk-1']);
  assert.equal(result.modelRun.decision, 'needs_review');
});

test('rejects a citation to a passage that was not supplied', async () => {
  const draft = validSourceAssessmentDraft();
  draft.dimensions[0].provenanceIds = ['invented-alias'];
  const result = await executeSourceAssessment('Does creatine improve strength?', document('full_text'), {
    provider: provider(draft), model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(result.status, 'needs_review');
  assert.equal(result.assessment, null);
  assert.equal(result.failure, 'invalid_provenance');
});

test('rejects an invented passage in the reader summary', async () => {
  const draft = validSourceAssessmentDraft();
  draft.readerBrief.keyPoints[0].provenanceIds = ['invented-alias'];
  const result = await executeSourceAssessment('Does creatine improve strength?', document('full_text'), {
    provider: provider(draft), model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(result.assessment, null);
  assert.equal(result.failure, 'invalid_provenance');
});

test('does not call the model when no passages are available', async () => {
  let called = false;
  const empty = { ...document('metadata_only'), chunks: [] };
  const fake = provider(validSourceAssessmentDraft());
  fake.generateStructured = async () => { called = true; throw new Error('must not run'); };
  const result = await executeSourceAssessment('question', empty, {
    provider: fake, model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(called, false);
  assert.equal(result.status, 'needs_review');
});

test('repairs one invalid structured draft without weakening the gate', async () => {
  let calls = 0;
  const fake = provider(validSourceAssessmentDraft());
  fake.generateStructured = async <T>() => {
    calls += 1;
    const output = calls === 1 ? { incomplete: true } : validSourceAssessmentDraft();
    return { output: output as T, provider: 'openai', model: 'research', requestId: `request-${calls}` };
  };
  const result = await executeSourceAssessment('Does creatine improve strength?', document('full_text'), {
    provider: fake, model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(calls, 2);
  assert.equal(result.status, 'model_draft');
  assert.deepEqual(result.modelRun.toolCalls, ['structured_output_retry']);
});

test('gives a failed design-specific check list exact bounded repair guidance', async () => {
  let calls = 0;
  let repairSystem = '';
  const fake = provider(validSourceAssessmentDraft());
  fake.generateStructured = async <T>(request: LlmExecutionRequest) => {
    calls += 1;
    if (calls === 2) repairSystem = request.system;
    const output = calls === 1
      ? { ...validSourceAssessmentDraft(), integrityChecks: [] }
      : validSourceAssessmentDraft();
    return { output: output as T, provider: 'openai', model: 'research', requestId: `request-${calls}` };
  };
  const result = await executeSourceAssessment('Does creatine improve strength?', document('full_text'), {
    provider: fake, model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(result.status, 'model_draft');
  assert.match(repairSystem, /Runtime validation issue: integrity_checks/);
  assert.match(repairSystem, /exactly 9 entries/);
  assert.match(repairSystem, /prospective_registration, prespecified_outcomes/);
  assert.match(repairSystem, /Use only these passage aliases: p1/);
});

test('does not retry a provider failure', async () => {
  let calls = 0;
  const fake = provider(validSourceAssessmentDraft());
  fake.generateStructured = async () => { calls += 1; throw new Error('Provider unavailable.'); };
  const result = await executeSourceAssessment('Does creatine improve strength?', document('full_text'), {
    provider: fake, model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(calls, 1);
  assert.equal(result.failure, 'provider_error');
});

test('records an exhausted contract repair in the model run', async () => {
  let calls = 0;
  const fake = provider({ incomplete: true });
  fake.generateStructured = async <T>() => {
    calls += 1;
    return { output: { incomplete: true } as T, provider: 'openai', model: 'research', requestId: `request-${calls}` };
  };
  const result = await executeSourceAssessment('Does creatine improve strength?', document('full_text'), {
    provider: fake, model: 'research', budgetProfile: 'economy', researchRunId: 'research-1',
  });
  assert.equal(calls, 2);
  assert.equal(result.failure, 'invalid_model_output');
  assert.deepEqual(result.modelRun.toolCalls, ['structured_output_retry']);
});
