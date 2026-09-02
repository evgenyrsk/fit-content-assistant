import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceDocument } from '../../domain/index.ts';
import { reuseStoredFullText } from './reuse-stored-full-text.ts';

const document: ScientificSourceDocument = {
  sourceId: 'pmid:42', provider: 'pmc', externalId: 'PMC42', title: 'Reusable review',
  pmid: '42', pmcid: 'PMC42', publicationTypes: ['Systematic Review'],
  recordStatus: 'active', contentLevel: 'full_text', fetchedAt: '2026-09-01T00:00:00.000Z',
  reuseRights: { status: 'permitted', license: 'CC BY', origin: 'pmc_open_access' },
  chunks: [
    { id: 'm', sourceId: 'pmid:42', kind: 'methods', locator: 'Methods', text: 'Methods' },
    { id: 'r', sourceId: 'pmid:42', kind: 'results', locator: 'Results', text: 'Results' },
  ],
};

test('reuses an eligible stored full text without counting it as a new download', async () => {
  const result = await reuseStoredFullText(['pmid:42'], {
    requested: 1, stored: 0, unavailable: 1, documents: [],
  }, { saveAll: async () => {}, findById: async () => document });
  assert.equal(result.stored, 0);
  assert.equal(result.reused, 1);
  assert.equal(result.unavailable, 0);
  assert.deepEqual(result.documents[0], {
    sourceId: 'pmid:42', pmcid: 'PMC42', license: 'CC BY', chunkCount: 2,
  });
});

test('does not reuse incomplete or inactive documents', async () => {
  const result = await reuseStoredFullText(['pmid:42'], {
    requested: 1, stored: 0, unavailable: 1, documents: [],
  }, { saveAll: async () => {}, findById: async () => ({ ...document, recordStatus: 'retracted' }) });
  assert.equal(result.reused, 0);
  assert.deepEqual(result.documents, []);
});
