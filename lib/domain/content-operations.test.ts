import assert from 'node:assert/strict';
import test from 'node:test';
import { validateContentReview, validateEditorialTransition, validateManualContent } from './content-operations.ts';

test('factual manual content requires approved claim links before persistence', () => {
  const errors = validateManualContent({
    format: 'threads', title: 'Рабочий тезис', text: 'Достаточно длинный фактический текст для проверки.',
    fragmentKind: 'fact', claimVersionIds: [], changeNote: '',
  });
  assert.ok(errors.some((error) => error.includes('approved claim')));
});

test('personal illustration cannot silently carry scientific claim links', () => {
  const errors = validateManualContent({
    format: 'reels', title: 'Личный опыт', text: 'Достаточно длинное описание личного опыта и наблюдений.',
    fragmentKind: 'illustration', claimVersionIds: ['claim-1'], changeNote: '',
  });
  assert.ok(errors.some((error) => error.includes('только для фактического')));
});

test('scheduling fails closed without a completed human fact-check', () => {
  const errors = validateEditorialTransition('ready', {
    contentItemId: 'item-1', editorialStatus: 'scheduled', scheduledFor: '2026-09-01T10:00:00.000Z',
  }, 'needs_review', new Date('2026-08-28T10:00:00.000Z'));
  assert.ok(errors.some((error) => error.includes('human fact-check')));
});

test('publishing requires a durable publication URL', () => {
  const errors = validateEditorialTransition('scheduled', {
    contentItemId: 'item-1', editorialStatus: 'published',
  }, 'ready_for_human_review', new Date('2026-08-28T10:00:00.000Z'));
  assert.ok(errors.some((error) => error.includes('ссылку')));
});

test('content approval requires all three explicit attestations', () => {
  const errors = validateContentReview({
    contentItemId: 'item-1', decision: 'approved', traceChecked: true,
    caveatsChecked: false, platformFitChecked: true, notes: '',
  });
  assert.deepEqual(errors, ['Проверьте сохранность оговорок.']);
});
