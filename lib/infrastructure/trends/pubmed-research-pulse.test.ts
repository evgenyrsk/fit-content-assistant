import assert from 'node:assert/strict';
import test from 'node:test';
import { mapPubmedPulse } from './pubmed-research-pulse.ts';

test('keeps research momentum distinct from social virality', () => {
  const candidates = mapPubmedPulse([{
    id: 'pubmed:1', provider: 'pubmed', pmid: '1', title: 'Effects of resistance training on muscle hypertrophy',
    authors: [], publishedAt: '2026 Aug 20', url: 'https://pubmed.ncbi.nlm.nih.gov/1/',
    sourceType: 'Journal Article', discoveredAt: '2026-08-27T00:00:00.000Z',
  }], new Date('2026-08-27T00:00:00.000Z'));
  assert.equal(candidates[0].source, 'pubmed_pulse');
  assert.equal(candidates[0].growthSignal, 'Недавняя научная публикация');
  assert.ok(candidates[0].scientificResearchability === 1);
});
