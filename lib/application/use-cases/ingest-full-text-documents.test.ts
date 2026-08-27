import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceDocument } from '../../domain/index.ts';
import { ingestFullTextDocuments } from './ingest-full-text-documents.ts';

const fullText: ScientificSourceDocument = {
  sourceId: 'pmid:1', provider: 'pmc', externalId: 'PMC1', title: 'Open study',
  pmid: '1', pmcid: 'PMC1', publicationTypes: ['PMC Open Access full text'],
  recordStatus: 'active', contentLevel: 'full_text',
  chunks: [{ id: 'pmid:1:pmc:1', sourceId: 'pmid:1', kind: 'methods', locator: 'PMC1:methods:1', text: 'Methods.' }],
  reuseRights: { status: 'permitted', license: 'CC BY', origin: 'pmc_open_access' },
  fetchedAt: '2026-08-27T00:00:00.000Z',
};

test('deduplicates requests and persists only reusable full texts returned by the loader', async () => {
  let requested: string[] = [];
  let stored: ScientificSourceDocument[] = [];
  const coverage = await ingestFullTextDocuments(['1', '1', '2'], {
    loader: { provider: 'pmc', load: async (ids) => { requested = ids; return [fullText]; } },
    store: { saveAll: async (documents) => { stored = documents; }, findById: async () => null },
  });

  assert.deepEqual(requested, ['1', '2']);
  assert.deepEqual(stored, [fullText]);
  assert.deepEqual(coverage, {
    requested: 2, stored: 1, unavailable: 1,
    documents: [{ sourceId: 'pmid:1', pmcid: 'PMC1', license: 'CC BY', chunkCount: 1 }],
  });
});
