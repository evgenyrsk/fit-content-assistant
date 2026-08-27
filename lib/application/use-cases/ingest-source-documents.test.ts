import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceDocument } from '../../domain/index.ts';
import { ingestSourceDocuments } from './ingest-source-documents.ts';

const document: ScientificSourceDocument = {
  sourceId: 'pmid:1',
  provider: 'pubmed',
  externalId: '1',
  title: 'Test study',
  pmid: '1',
  publicationTypes: ['Randomized Controlled Trial'],
  recordStatus: 'active',
  contentLevel: 'abstract_only',
  chunks: [{ id: 'pmid:1:abstract:0', sourceId: 'pmid:1', kind: 'abstract', locator: 'Abstract', text: 'Result.' }],
  fetchedAt: '2026-08-27T00:00:00.000Z',
};

test('deduplicates ids, persists loaded documents and reports conservative coverage', async () => {
  let requested: string[] = [];
  let stored: ScientificSourceDocument[] = [];
  const coverage = await ingestSourceDocuments(['1', '1', '2'], {
    loader: {
      provider: 'pubmed',
      load: async (ids) => {
        requested = ids;
        return [document];
      },
    },
    store: {
      saveAll: async (documents) => { stored = documents; },
      findById: async () => null,
    },
  });

  assert.deepEqual(requested, ['1', '2']);
  assert.deepEqual(stored, [document]);
  assert.deepEqual(coverage, { requested: 2, stored: 1, abstractOnly: 1, unavailable: 1 });
});

test('does not call adapters when there are no ids', async () => {
  let called = false;
  const coverage = await ingestSourceDocuments([], {
    loader: { provider: 'pubmed', load: async () => { called = true; return []; } },
    store: { saveAll: async () => { called = true; }, findById: async () => null },
  });

  assert.equal(called, false);
  assert.deepEqual(coverage, { requested: 0, stored: 0, abstractOnly: 0, unavailable: 0 });
});
