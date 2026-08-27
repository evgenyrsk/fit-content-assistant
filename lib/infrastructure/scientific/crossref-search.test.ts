import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCrossrefWorks } from './crossref-search.ts';

test('maps versioned Crossref metadata to a source candidate', () => {
  const candidates = parseCrossrefWorks({ message: { items: [{
    DOI: '10.1000/EXAMPLE',
    URL: 'https://doi.org/10.1000/example',
    title: ['Training volume and muscle growth'],
    author: [{ given: 'Ada', family: 'Lovelace' }],
    'container-title': ['Evidence Journal'],
    type: 'journal-article',
    published: { 'date-parts': [[2025, 7, 3]] },
  }] } }, '2026-08-27T00:00:00.000Z');
  assert.equal(candidates[0].doi, '10.1000/example');
  assert.equal(candidates[0].publishedAt, '2025-07-03');
  assert.deepEqual(candidates[0].authors, ['Ada Lovelace']);
});

test('ignores Crossref records without a title', () => {
  assert.deepEqual(parseCrossrefWorks({ message: { items: [{}] } }, '2026-08-27T00:00:00.000Z'), []);
});
