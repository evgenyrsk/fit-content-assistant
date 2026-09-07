import assert from 'node:assert/strict';
import test from 'node:test';
import { eligiblePubmedPulse, mapPubmedPulse } from './pubmed-research-pulse.ts';

function source(publishedAt: string) {
  return {
    id: 'pubmed:1', provider: 'pubmed' as const, pmid: '1', title: 'Effects of resistance training on muscle hypertrophy',
    authors: [], publishedAt, url: 'https://pubmed.ncbi.nlm.nih.gov/1/',
    sourceType: 'Journal Article', discoveredAt: '2026-08-27T00:00:00.000Z',
  };
}

test('keeps research momentum distinct from social virality', () => {
  const candidates = mapPubmedPulse([source('2026 Aug 20')], new Date('2026-08-27T00:00:00.000Z'));
  assert.equal(candidates[0].source, 'pubmed_pulse');
  assert.equal(candidates[0].growthSignal, 'Недавняя научная публикация');
  assert.ok(candidates[0].scientificResearchability === 1);
});

test('uses discovery time when PubMed exposes only a publication year', () => {
  const candidates = mapPubmedPulse([source('2026')], new Date('2026-09-07T00:00:00.000Z'));
  assert.equal(candidates[0].freshnessMinutes, 0);
  assert.equal(candidates[0].status, 'live');
});

test('does not present stale papers as current research pulse', () => {
  const candidates = eligiblePubmedPulse([source('2025 Jan 1')], new Date('2026-09-07T00:00:00.000Z'), 6);
  assert.deepEqual(candidates, []);
});
