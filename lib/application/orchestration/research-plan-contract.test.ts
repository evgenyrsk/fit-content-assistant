import assert from 'node:assert/strict';
import test from 'node:test';
import { validateResearchPlan, type ResearchPlanDraft } from './research-plan-contract.ts';

function validPlan(): ResearchPlanDraft {
  return {
    normalizedQuestion: 'Влияет ли креатин на силовые показатели?',
    questionType: 'intervention_effect',
    population: 'здоровые взрослые',
    intervention: 'креатин',
    comparator: 'плацебо',
    outcomes: ['силовые показатели'],
    inclusionCriteria: ['контролируемые исследования'],
    exclusionCriteria: ['исследования без целевого исхода'],
    disconfirmingEvidence: ['нулевой эффект в адекватно мощном исследовании'],
    searchQuery: '(creatine) AND (strength)',
    ambiguities: [],
  };
}

test('accepts a complete balanced research plan', () => {
  assert.deepEqual(validateResearchPlan(validPlan()), validPlan());
});

test('rejects a plan without disconfirming evidence', () => {
  assert.throws(() => validateResearchPlan({ ...validPlan(), disconfirmingEvidence: [] }));
});

test('rejects unexpected fields even if the rest is valid', () => {
  assert.throws(() => validateResearchPlan({ ...validPlan(), answer: 'Definitely yes' }));
});
