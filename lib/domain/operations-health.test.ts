import assert from 'node:assert/strict';
import test from 'node:test';
import { operationsHealthStatus } from './operations-health.ts';

test('an incomplete model run or overdue source requires attention without opening any gate', () => {
  assert.equal(operationsHealthStatus(1, 0), 'attention_required');
  assert.equal(operationsHealthStatus(0, 1), 'attention_required');
  assert.equal(operationsHealthStatus(0, 0), 'healthy');
});
