import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceDocument } from './source-document.ts';
import { evaluateSourceIntake, minimumAbstractCharacters } from './source-intake-policy.ts';

function document(overrides: Partial<ScientificSourceDocument> = {}): ScientificSourceDocument {
  return {
    sourceId: 'pmid:123', provider: 'pubmed', externalId: '123', title: 'Research article',
    pmid: '123', publicationTypes: ['Randomized Controlled Trial'], recordStatus: 'active',
    contentLevel: 'abstract_only',
    chunks: [{ id: 'chunk:1', sourceId: 'pmid:123', kind: 'abstract', locator: 'abstract:results', text: 'x'.repeat(minimumAbstractCharacters) }],
    fetchedAt: '2026-08-27T00:00:00.000Z', ...overrides,
  };
}

test('admits a stable active research record only to triage', () => {
  const decision = evaluateSourceIntake(document());
  assert.equal(decision.decision, 'admitted_to_triage');
  assert.deepEqual(decision.reasons, ['eligible_abstract']);
});

test('rejects retracted and expression-of-concern records', () => {
  assert.deepEqual(evaluateSourceIntake(document({ recordStatus: 'retracted' })).reasons, ['record_retracted']);
  assert.deepEqual(
    evaluateSourceIntake(document({ recordStatus: 'expression_of_concern' })).reasons,
    ['record_expression_of_concern'],
  );
});

test('rejects non-research publication types even when an abstract exists', () => {
  const decision = evaluateSourceIntake(document({ publicationTypes: ['Editorial'] }));
  assert.equal(decision.decision, 'rejected');
  assert.deepEqual(decision.reasons, ['non_research_publication']);
});

test('rejects missing and undersized abstracts', () => {
  const missing = evaluateSourceIntake(document({ contentLevel: 'metadata_only', chunks: [] }));
  const short = evaluateSourceIntake(document({ chunks: [{ id: 'short', sourceId: 'pmid:123', kind: 'abstract', locator: 'abstract', text: 'Too short.' }] }));
  assert.deepEqual(missing.reasons, ['abstract_missing']);
  assert.deepEqual(short.reasons, ['abstract_too_short']);
});

test('keeps corrected research records in triage with an explicit review flag', () => {
  const decision = evaluateSourceIntake(document({ recordStatus: 'corrected' }));
  assert.equal(decision.decision, 'admitted_to_triage');
  assert.deepEqual(decision.reasons, ['corrected_record_requires_review']);
});
