import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePubmedSummaries } from './pubmed-search.ts';

test('maps PubMed summaries without treating them as approved evidence', () => {
  const candidates = parsePubmedSummaries({ result: {
    uids: ['123'],
    '123': {
      title: 'Resistance training to failure and hypertrophy',
      pubdate: '2025 Jan',
      fulljournalname: 'Journal of Training',
      pubtype: ['Meta-Analysis'],
      authors: [{ name: 'A Author' }],
      articleids: [{ idtype: 'doi', value: '10.1000/example' }],
    },
  } }, '2026-08-27T00:00:00.000Z');
  assert.equal(candidates[0].pmid, '123');
  assert.equal(candidates[0].doi, '10.1000/example');
  assert.equal(candidates[0].provider, 'pubmed');
});

test('ignores incomplete PubMed records', () => {
  assert.deepEqual(parsePubmedSummaries({ result: { uids: ['123'], '123': {} } }, '2026-08-27T00:00:00.000Z'), []);
});
