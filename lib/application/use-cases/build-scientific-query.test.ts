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

test('translates breakfast and compensatory-eating terms for evidence retrieval', () => {
  assert.equal(
    buildScientificQuery('Снижает ли регулярный завтрак вероятность переедания в течение дня у взрослых?'),
    'breakfast compensatory eating energy intake',
  );
});

test('keeps a question unchanged when the controlled vocabulary has no match', () => {
  assert.equal(buildScientificQuery('Неизвестный вопрос'), 'Неизвестный вопрос');
});

test('covers the representative fitness research matrix', () => {
  const cases = [
    ['Какая доза белка нужна для роста мышц?', 'dose dietary protein muscle hypertrophy'],
    ['Помогает ли ходьба для похудения?', 'walking steps weight loss'],
    ['Как сон влияет на восстановление?', 'sleep recovery'],
    ['Какой объём тренировок нужен для роста мышц?', 'training volume muscle hypertrophy'],
    ['Влияет ли отдых между подходами на силу?', 'rest interval strength'],
    ['Улучшает ли кофеин выносливость?', 'caffeine endurance'],
    ['Мешает ли кардио росту мышц?', 'aerobic exercise muscle hypertrophy'],
    ['Ускоряет ли ледяная ванна восстановление?', 'cold water immersion recovery'],
    ['Помогает ли растяжка улучшить гибкость?', 'stretching flexibility'],
    ['Безопасен ли креатин для здоровых взрослых?', 'safety adverse events creatine healthy adults'],
    ['Как частота тренировок влияет на рост мышц?', 'training frequency muscle hypertrophy'],
    ['Помогает ли магний от мышечных судорог?', 'magnesium muscle cramps'],
    ['Улучшает ли бета-аланин выносливость?', 'beta alanine endurance'],
    ['Означает ли мышечная боль хороший рост мышц?', 'delayed onset muscle soreness muscle hypertrophy'],
    ['Связано ли число шагов со смертностью?', 'walking steps mortality'],
  ] as const;
  for (const [question, expected] of cases) assert.equal(buildScientificQuery(question), expected);
});
