import assert from 'node:assert/strict';
import test from 'node:test';
import type { OperationsHealth } from '../../lib/domain/index.ts';
import { operationsHealthPresentation } from './operations-health-presentation.ts';

const healthy: OperationsHealth = {
  status: 'healthy', modelRuns24h: 3, incompleteModelRuns24h: 0, modelCostUsd24h: 0.0123,
  dueSourceRevalidations: 1, generatedAt: '2026-09-07T00:00:00.000Z',
  objectives: {
    availabilityTarget: '99.5% monthly', apiLatencyTarget: '< 3s excluding external LLM/research providers',
    integrityTarget: '0 unsupported factual publications',
  },
};

test('shows a concise healthy production summary', () => {
  const view = operationsHealthPresentation(healthy, false);
  assert.equal(view.state, 'healthy');
  assert.match(view.title, /в норме/);
  assert.ok(view.facts.some((fact) => fact.includes('99.5%')));
});

test('fails visibly when operational status cannot be read', () => {
  const view = operationsHealthPresentation(null, false);
  assert.equal(view.state, 'attention_required');
  assert.match(view.detail, /диагностика требует проверки/);
});
