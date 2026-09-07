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

test('ranks with explicit style and research explanations without creating evidence', async () => {
  const provider: TrendProvider = { source: 'threads', discover: async () => [{
    id: 'threads:1', title: 'Почему больше подходов не всегда лучше?', source: 'threads',
    sourceLabel: 'Threads · keyword search', observedAt: '2026-09-07T00:00:00.000Z',
    freshnessMinutes: 15, growthSignal: 'TOP Threads', audienceFit: 1,
    scientificResearchability: 0.8, saturationRisk: 0.2, platforms: ['Threads'], status: 'live',
  }] };
  const result = await discoverTrends({ region: 'RU', limit: 6 }, { providers: [provider] });
  assert.ok((result.candidates[0].styleFit ?? 0) >= 0.9);
  assert.match(result.candidates[0].rankReasons?.join(' ') ?? '', /Исследуемость/);
  assert.equal('claimVersionId' in result.candidates[0], false);
});
