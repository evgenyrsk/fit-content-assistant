import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceDocument, SourceChunkKind } from '../../domain/index.ts';
import { selectAssessmentPassages } from './select-assessment-passages.ts';

function document(): ScientificSourceDocument {
  const kinds: SourceChunkKind[] = ['other', 'discussion', 'methods', 'results'];
  return {
    sourceId: 'pmid:1', provider: 'pmc', externalId: 'PMC1', pmid: '1', title: 'Study',
    publicationTypes: ['Systematic Review'], recordStatus: 'active', contentLevel: 'full_text',
    chunks: Array.from({ length: 20 }, (_, index) => ({
      id: `chunk-${index}`, sourceId: 'pmid:1', kind: kinds[index % kinds.length],
      locator: `section:${index}`, text: `${kinds[index % kinds.length]} ${'evidence '.repeat(600)}`,
    })),
    fetchedAt: '2026-09-02T00:00:00.000Z',
  };
}

test('keeps a bounded methods-and-results packet for assessment', () => {
  const selected = selectAssessmentPassages(document());
  assert.ok(selected.chunks.some((item) => item.kind === 'methods'));
  assert.ok(selected.chunks.some((item) => item.kind === 'results'));
  assert.ok(selected.chunks.length <= 12);
  assert.ok(selected.chunks.reduce((total, item) => total + item.text.length, 0) <= 32_000);
});
