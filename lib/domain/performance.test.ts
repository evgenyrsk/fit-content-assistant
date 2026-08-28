import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePublicationMetricsCsv, validatePublicationMetric } from './performance.ts';

test('CSV metrics parser accepts quoted platform values and optional watch time', () => {
  const result = parsePublicationMetricsCsv([
    'content_item_id,platform,recorded_at,views,likes,comments,saves,shares,watch_time_seconds',
    'item-1,"Threads",2026-08-28T10:00:00.000Z,1000,80,20,30,15,',
  ].join('\n'));
  assert.equal(result.length, 1);
  assert.equal(result[0].platform, 'Threads');
  assert.equal(result[0].saves, 30);
  assert.equal(result[0].source, 'csv');
});

test('CSV metrics parser fails closed when a required column is absent', () => {
  assert.throws(() => parsePublicationMetricsCsv('content_item_id,views\nitem-1,10'), /platform/);
});

test('negative publication metrics are rejected', () => {
  const errors = validatePublicationMetric({
    contentItemId: 'item-1', platform: 'Threads', recordedAt: '2026-08-28T10:00:00.000Z',
    views: 10, likes: -1, comments: 0, saves: 0, shares: 0, source: 'manual',
  });
  assert.ok(errors.some((error) => error.includes('likes')));
});
