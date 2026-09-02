import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScientificQuery } from './build-scientific-query.ts';

test('translates common Russian fitness terms for scientific providers', () => {
  assert.equal(buildScientificQuery('Влияет ли креатин на силу?'), 'creatine strength');
});

test('translates inflected Russian training-to-failure and hypertrophy terms', () => {
  assert.equal(
    buildScientificQuery('Нужно ли тренироваться до отказа для роста мышц?'),
    'training to failure muscle hypertrophy',
  );
});

test('keeps a question unchanged when the controlled vocabulary has no match', () => {
  assert.equal(buildScientificQuery('Неизвестный вопрос'), 'Неизвестный вопрос');
});
