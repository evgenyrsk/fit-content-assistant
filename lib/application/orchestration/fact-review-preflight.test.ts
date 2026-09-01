import assert from 'node:assert/strict';
import test from 'node:test';
import { missingRequiredCaveats } from './fact-review-preflight.ts';
import { validVoiceEdit } from './content-pipeline.fixture.ts';

test('finds a required caveat in actual draft fragments', () => {
  assert.deepEqual(missingRequiredCaveats(validVoiceEdit, validVoiceEdit.preservedCaveats), []);
});

test('does not trust preserved-caveat metadata when text is absent', () => {
  const draft = { ...validVoiceEdit, fragments: validVoiceEdit.fragments.slice(0, 2) };
  assert.deepEqual(missingRequiredCaveats(draft, validVoiceEdit.preservedCaveats), validVoiceEdit.preservedCaveats);
});
