import assert from 'node:assert/strict';
import test from 'node:test';
import type { D1Database } from '@cloudflare/workers-types';
import { resolveStoredSourceId } from './resolve-source-id.ts';

function databaseReturning(id: string | null): D1Database {
  return {
    prepare: () => ({
      bind: () => ({ first: async () => id ? { id } : null }),
    }),
  } as unknown as D1Database;
}

test('reuses a legacy DOI source id for the same PMID', async () => {
  const id = await resolveStoredSourceId(databaseReturning('doi:10.1000/example'), {
    sourceId: 'pmid:12345', pmid: '12345', doi: '10.1000/example',
  });
  assert.equal(id, 'doi:10.1000/example');
});

test('keeps the requested id when the source is new', async () => {
  const id = await resolveStoredSourceId(databaseReturning(null), { sourceId: 'pmid:12345' });
  assert.equal(id, 'pmid:12345');
});
