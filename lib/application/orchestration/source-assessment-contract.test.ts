import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSourceAssessmentDraft } from './source-assessment-contract.ts';
import { validSourceAssessmentDraft } from './source-assessment.fixture.ts';

test('accepts every required dimension and design-specific check', () => {
  const draft = validSourceAssessmentDraft();
  assert.deepEqual(validateSourceAssessmentDraft(draft), draft);
});

test('fails closed when a design-specific check is absent', () => {
  const draft = validSourceAssessmentDraft();
  assert.throws(() => validateSourceAssessmentDraft({ ...draft, integrityChecks: draft.integrityChecks.slice(1) }));
});

test('rejects unexpected top-level or nested fields', () => {
  const draft = validSourceAssessmentDraft();
  assert.throws(() => validateSourceAssessmentDraft({ ...draft, conclusion: 'works' }));
  assert.throws(() => validateSourceAssessmentDraft({
    ...draft,
    dimensions: [{ ...draft.dimensions[0], score: 10 }, ...draft.dimensions.slice(1)],
  }));
});

test('requires result, method and limitation in the fast-reading brief', () => {
  const draft = validSourceAssessmentDraft();
  draft.readerBrief.keyPoints = draft.readerBrief.keyPoints.map((point) => ({ ...point, type: 'main_result' }));
  assert.throws(() => validateSourceAssessmentDraft(draft), /reader_brief/);
});

test('requires cited participant details and a fixed unavailable state', () => {
  const draft = validSourceAssessmentDraft();
  draft.readerBrief.studySnapshot.sampleSize = { value: '42 participants', reported: true, provenanceIds: [] };
  assert.throws(() => validateSourceAssessmentDraft(draft), /reader_brief/);
  draft.readerBrief.studySnapshot.sampleSize = { value: 'Не указано в доступном тексте.', reported: false, provenanceIds: ['p1'] };
  assert.throws(() => validateSourceAssessmentDraft(draft), /reader_brief/);
});
