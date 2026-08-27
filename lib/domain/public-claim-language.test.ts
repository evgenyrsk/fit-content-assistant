import assert from 'node:assert/strict';
import test from 'node:test';
import { publicClaimLanguage } from './public-claim-language.ts';

test('unreviewed claims cannot become factual public text', () => {
  const policy = publicClaimLanguage({ confidence: 'high', status: 'needs_review', reviewMode: 'human', methodologyCalibrated: false });
  assert.equal(policy.strength, 'blocked');
});

test('automatic approval stays blocked before calibration', () => {
  const policy = publicClaimLanguage({ confidence: 'high', status: 'approved', reviewMode: 'automatic', methodologyCalibrated: false });
  assert.equal(policy.strength, 'blocked');
});

test('human-approved moderate evidence requires qualified language', () => {
  const policy = publicClaimLanguage({ confidence: 'moderate', status: 'approved', reviewMode: 'human', methodologyCalibrated: false });
  assert.equal(policy.strength, 'qualified');
  assert.ok(policy.allowedLeadIns.includes('вероятно'));
});

test('insufficient evidence remains blocked after human review', () => {
  const policy = publicClaimLanguage({ confidence: 'insufficient', status: 'approved', reviewMode: 'human', methodologyCalibrated: false });
  assert.equal(policy.strength, 'blocked');
});
