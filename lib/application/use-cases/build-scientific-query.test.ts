import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScientificQuery } from './build-scientific-query.ts';

test('translates common Russian fitness terms for scientific providers', () => {
  assert.equal(buildScientificQuery('Влияет ли креатин на силу?'), 'creatine strength');
});

test('keeps a question unchanged when the controlled vocabulary has no match', () => {
  assert.equal(buildScientificQuery('Неизвестный вопрос'), 'Неизвестный вопрос');
});
