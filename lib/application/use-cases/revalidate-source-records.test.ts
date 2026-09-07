import assert from 'node:assert/strict';
import test from 'node:test';
import { revalidateSourceRecords } from './revalidate-source-records.ts';
import type { ScientificSourceDocument } from '../../domain/index.ts';

const document: ScientificSourceDocument = {
  sourceId: 'pmid:1', provider: 'pubmed', externalId: '1', pmid: '1', title: 'Study',
  publicationTypes: ['Retracted Publication'], recordStatus: 'retracted',
  contentLevel: 'metadata_only', chunks: [], fetchedAt: '2026-08-28T12:00:00.000Z',
};

test('revalidates record integrity and audits status changes', async () => {
  const saved: ScientificSourceDocument[][] = [];
  const events: Array<{ eventType: string }> = [];
  const result = await revalidateSourceRecords([
    { sourceId: 'pmid:1', pmid: '1', previousRecordStatus: 'active' },
  ], {
    now: () => new Date('2026-08-28T12:00:00.000Z'),
    loader: { provider: 'pubmed', load: async () => [document] },
    documents: { saveAll: async (records) => { saved.push(records); }, findById: async () => null },
    audit: { save: async (event) => { events.push(event); } },
  });
  assert.deepEqual(result, { checked: 1, changed: 1, unavailable: 0, blockedClaims: 0, blockedContent: 0, completedAt: document.fetchedAt });
  assert.equal(saved[0][0].recordStatus, 'retracted');
  assert.equal(events[0].eventType, 'source_integrity_status_changed');
});

test('blocks dependent claims and scheduled content after a harmful status change', async () => {
  const result = await revalidateSourceRecords([
    { sourceId: 'pmid:1', pmid: '1', previousRecordStatus: 'active' },
  ], {
    now: () => new Date('2026-08-28T12:00:00.000Z'),
    loader: { provider: 'pubmed', load: async () => [document] },
    documents: { saveAll: async () => undefined, findById: async () => null },
    audit: { save: async () => undefined },
    maintenance: { blockDependents: async (sourceId, status) => {
      assert.equal(sourceId, 'pmid:1');
      assert.equal(status, 'retracted');
      return { blockedClaims: 2, blockedContent: 1 };
    } },
  });
  assert.equal(result.blockedClaims, 2);
  assert.equal(result.blockedContent, 1);
});
