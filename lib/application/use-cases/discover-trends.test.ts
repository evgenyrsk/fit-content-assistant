import assert from 'node:assert/strict';
import test from 'node:test';
import type { TrendProvider } from '../ports/trend-provider.ts';
import { discoverTrends } from './discover-trends.ts';

test('distinguishes a connected empty source from an unavailable source', async () => {
  const connected: TrendProvider = { source: 'threads', discover: async () => [] };
  const empty = await discoverTrends({ region: 'RU', limit: 6 }, {
    providers: [connected],
    expectedSources: ['threads'],
    sourceNotices: { threads: 'Тестовый режим.' },
  });

  assert.equal(empty.status, 'empty');
  assert.deepEqual(empty.activeSources, ['threads']);
  assert.equal(empty.sourceNotices.threads, 'Тестовый режим.');

  const unavailable = await discoverTrends({ region: 'RU', limit: 6 }, {
    providers: [],
    expectedSources: ['threads'],
  });
  assert.equal(unavailable.status, 'unavailable');
  assert.deepEqual(unavailable.unavailableSources, ['threads']);
});
