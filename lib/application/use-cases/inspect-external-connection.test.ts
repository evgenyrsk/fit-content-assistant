import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectExternalConnection } from './inspect-external-connection.ts';

const now = () => new Date('2026-08-28T12:00:00.000Z');

test('reports a reachable personal Threads account without requiring public review', async () => {
  const result = await inspectExternalConnection({
    source: 'threads', configured: true, operatingMode: 'personal',
  }, {
    now,
    probe: { inspect: async () => ({ status: 'reachable', accountLabel: 'evgeny.rsk' }) },
  });

  assert.equal(result.state, 'connected');
  assert.equal(result.accountLabel, 'evgeny.rsk');
  assert.match(result.detail, /Публичная проверка не нужна/);
  assert.equal(result.credentialFreshness, 'unknown');
});

test('distinguishes missing configuration from rejected credentials', async () => {
  const missing = await inspectExternalConnection({
    source: 'threads', configured: false, operatingMode: 'personal',
  }, { now });
  assert.equal(missing.state, 'not_configured');

  const rejected = await inspectExternalConnection({
    source: 'threads', configured: true, operatingMode: 'personal',
    expiresAt: '2026-08-27T12:00:00.000Z',
  }, {
    now,
    probe: { inspect: async () => ({ status: 'failed', reason: 'credentials' }) },
  });
  assert.equal(rejected.state, 'attention_required');
  assert.equal(rejected.credentialFreshness, 'expired');
});

test('warns before a known credential expiration', async () => {
  const result = await inspectExternalConnection({
    source: 'threads', configured: true, operatingMode: 'personal',
    expiresAt: '2026-09-02T12:00:00.000Z',
  }, {
    now,
    probe: { inspect: async () => ({ status: 'reachable' }) },
  });
  assert.equal(result.state, 'connected');
  assert.equal(result.credentialFreshness, 'refresh_soon');
  assert.match(result.recommendedAction ?? '', /Обновить доступ/);
});
