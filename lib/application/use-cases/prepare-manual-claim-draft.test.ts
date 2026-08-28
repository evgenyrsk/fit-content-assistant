import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareManualClaimDraft } from './prepare-manual-claim-draft.ts';
import type { ManualEvidenceOption } from '../../domain/index.ts';

const options: ManualEvidenceOption[] = [
  { sourceChunkId: 'm1', sourceId: 's1', sourceTitle: 'Study', sourceType: 'RCT', kind: 'methods', locator: 'Methods', excerpt: 'Methods' },
  { sourceChunkId: 'r1', sourceId: 's1', sourceTitle: 'Study', sourceType: 'RCT', kind: 'results', locator: 'Results', excerpt: 'Results' },
];

function input() {
  return {
    topic: 'Креатин', statement: 'Креатин может умеренно повышать прирост силы у здоровых взрослых.',
    population: 'здоровые взрослые', outcome: 'прирост силы', confidence: 'moderate',
    limitations: ['Не переносить вывод на людей с заболеваниями почек.'],
    evidence: [
      { sourceChunkId: 'm1', direction: 'neutral', weight: 'context' },
      { sourceChunkId: 'r1', direction: 'supporting', weight: 'primary' },
    ],
    reviewDueAt: '2027-08-28T00:00:00.000Z',
  };
}

test('creates a needs-review manual claim only from eligible full-text evidence', async () => {
  const claim = await prepareManualClaimDraft(input(), options, {
    now: () => new Date('2026-08-28T00:00:00.000Z'), createId: () => 'claim-version-1',
  });
  assert.equal(claim.status, 'needs_review');
  assert.equal(claim.evidence.length, 2);
  assert.equal(claim.methodologyVersion, 'manual-owner-review-v1');
});

test('rejects a claim without both methods and result provenance', async () => {
  await assert.rejects(() => prepareManualClaimDraft({ ...input(), evidence: [input().evidence[1], input().evidence[1]] }, options));
});
