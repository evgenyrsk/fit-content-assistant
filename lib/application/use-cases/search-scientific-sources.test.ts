import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceCandidate } from '../../domain/index.ts';
import type { ScientificSourceSearch } from '../ports/scientific-source-search.ts';
import { searchScientificSources } from './search-scientific-sources.ts';

function candidate(id: string, provider: 'pubmed' | 'crossref'): ScientificSourceCandidate {
  return {
    id: `${provider}:${id}`, provider, title: `Study ${id}`, authors: [],
    pmid: provider === 'pubmed' ? id : undefined,
    url: `https://example.test/${id}`, sourceType: 'journal article',
    discoveredAt: '2026-09-02T00:00:00.000Z',
  };
}

function search(provider: 'pubmed' | 'crossref', resolver: (query: string) => ScientificSourceCandidate[]): ScientificSourceSearch {
  return { provider, search: async ({ query }) => resolver(query) };
}

test('reserves candidate space for a broader deterministic PubMed query', async () => {
  const primary = Array.from({ length: 10 }, (_, index) => candidate(String(index + 1), 'pubmed'));
  const broader = Array.from({ length: 4 }, (_, index) => candidate(String(index + 101), 'pubmed'));
  const result = await searchScientificSources('русский вопрос', 10, {
    retrievalQuery: 'over-restricted planned query', fallbackRetrievalQuery: 'broad query',
    searches: [search('pubmed', (query) => query === 'broad query' ? broader : primary)],
    createId: () => 'run-1', now: () => new Date('2026-09-02T00:00:00.000Z'),
  });
  assert.deepEqual(result.candidates.map((item) => item.pmid), ['1', '2', '3', '4', '5', '6', '101', '102', '103', '104']);
  assert.match(result.warnings.join(' '), /дополнен/);
});

test('uses the broad PubMed fallback when the planned query is empty', async () => {
  const result = await searchScientificSources('креатин', 10, {
    retrievalQuery: 'too strict', fallbackRetrievalQuery: 'creatine strength',
    searches: [
      search('pubmed', (query) => query === 'too strict' ? [] : [candidate('42', 'pubmed')]),
      search('crossref', () => [candidate('crossref-only', 'crossref')]),
    ],
    createId: () => 'run-2', now: () => new Date('2026-09-02T00:00:00.000Z'),
  });
  assert.equal(result.candidates[0].pmid, '42');
  assert.deepEqual(result.searchedProviders.sort(), ['crossref', 'pubmed']);
});
