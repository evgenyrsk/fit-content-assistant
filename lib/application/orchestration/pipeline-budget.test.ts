import assert from 'node:assert/strict';
import test from 'node:test';
import { stageBudget } from './pipeline-budget.ts';

test('reserves enough output space for the complete source assessment contract', () => {
  assert.equal(stageBudget('source_assessment', 'economy').maxOutputTokens, 7200);
  assert.equal(stageBudget('source_assessment', 'balanced').maxOutputTokens, 9000);
});

test('keeps content drafting economical while scientific review gets its own budget', () => {
  assert.equal(stageBudget('platform_draft', 'economy').maxOutputTokens, 900);
  assert.equal(stageBudget('fact_review', 'economy').maxOutputTokens, 1800);
});
