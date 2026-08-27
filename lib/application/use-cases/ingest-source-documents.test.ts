import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceDocument } from '../../domain/index.ts';
import { minimumAbstractCharacters } from '../../domain/index.ts';
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
  chunks: [{ id: 'pmid:1:abstract:0', sourceId: 'pmid:1', kind: 'abstract', locator: 'Abstract', text: 'x'.repeat(minimumAbstractCharacters) }],
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
  assert.equal(coverage.requested, 2);
  assert.equal(coverage.fetched, 1);
  assert.equal(coverage.stored, 1);
  assert.equal(coverage.abstractOnly, 1);
  assert.equal(coverage.rejected, 0);
  assert.equal(coverage.unavailable, 1);
  assert.equal(coverage.decisions[0].decision, 'admitted_to_triage');
});

test('does not call adapters when there are no ids', async () => {
  let called = false;
  const coverage = await ingestSourceDocuments([], {
    loader: { provider: 'pubmed', load: async () => { called = true; return []; } },
    store: { saveAll: async () => { called = true; }, findById: async () => null },
  });

  assert.equal(called, false);
  assert.deepEqual(coverage, {
    requested: 0, fetched: 0, stored: 0, abstractOnly: 0, rejected: 0, unavailable: 0, decisions: [],
  });
});

test('persists only documents admitted by the deterministic intake policy', async () => {
  let stored: ScientificSourceDocument[] = [];
  const editorial = { ...document, sourceId: 'pmid:2', pmid: '2', externalId: '2', publicationTypes: ['Editorial'] };
  const coverage = await ingestSourceDocuments(['1', '2'], {
    loader: { provider: 'pubmed', load: async () => [document, editorial] },
    store: { saveAll: async (documents) => { stored = documents; }, findById: async () => null },
  });

  assert.deepEqual(stored.map((item) => item.sourceId), ['pmid:1']);
  assert.equal(coverage.rejected, 1);
  assert.deepEqual(coverage.decisions[1].reasons, ['non_research_publication']);
});
