import assert from 'node:assert/strict';
import { canAutomaticallyApproveClaim, methodologyRelease } from '../../lib/domain/evidence-policy.ts';
import { publicClaimLanguage } from '../../lib/domain/public-claim-language.ts';
import { validateEditorialTransition } from '../../lib/domain/content-operations.ts';

const results: Array<{ gate: string; passed: boolean }> = [];

function gate(name: string, check: () => void) {
  try {
    check();
    results.push({ gate: name, passed: true });
  } catch (error) {
    results.push({ gate: name, passed: false });
    throw error;
  }
}

gate('automatic claim approval remains disabled before calibration', () => {
  assert.equal(methodologyRelease.calibrated, false);
  assert.equal(canAutomaticallyApproveClaim(), false);
});

gate('unreviewed claims have no publishable language', () => {
  const language = publicClaimLanguage({
    confidence: 'high', status: 'needs_review', reviewMode: 'human', methodologyCalibrated: false,
  });
  assert.equal(language.strength, 'blocked');
  assert.deepEqual(language.allowedLeadIns, []);
});

gate('unreviewed content cannot be scheduled', () => {
  const errors = validateEditorialTransition('ready', {
    contentItemId: 'dry-run-item', editorialStatus: 'scheduled', scheduledFor: '2026-09-08T12:00:00.000Z',
  }, 'needs_review', new Date('2026-09-07T12:00:00.000Z'));
  assert.ok(errors.some((error) => error.includes('human fact-check')));
});

gate('published transition requires a publication URL', () => {
  const errors = validateEditorialTransition('scheduled', {
    contentItemId: 'dry-run-item', editorialStatus: 'published',
  }, 'ready_for_human_review', new Date('2026-09-07T12:00:00.000Z'));
  assert.ok(errors.some((error) => error.includes('ссылку')));
});

console.log(JSON.stringify({ suite: 'release-readiness-negative-gates', passed: results.every((item) => item.passed), results }, null, 2));
