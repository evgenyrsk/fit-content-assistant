import assert from 'node:assert/strict';
import test from 'node:test';
import { readyBody } from '../../lib/application/orchestration/claim-synthesis.fixture.ts';
import type { BodyAssessmentHumanReview } from '../../lib/domain/index.ts';
import { claimDraftActionMessage, savedBodyReviewMessage } from './body-review-presentation.ts';

function review(decision: BodyAssessmentHumanReview['decision']): BodyAssessmentHumanReview {
  return {
    id: 'review-1', bodyAssessmentId: 'body-1', decision, evidenceSetChecked: true,
    contradictionsChecked: true, certaintyChecked: true, scopeChecked: true,
    reason: 'Проверено человеком.', reviewerId: 'owner', createdAt: '2026-09-07T00:00:00.000Z',
  };
}

test('UI does not promise a claim draft after rejection', () => {
  assert.match(savedBodyReviewMessage(review('rejected')), /закрыт/);
  assert.doesNotMatch(savedBodyReviewMessage(review('rejected')), /Можно подготовить/);
});

test('UI explains that unknown publication bias lowers certainty without blocking the draft', () => {
  const body = {
    ...readyBody,
    assessment: {
      ...readyBody.assessment,
      domains: readyBody.assessment.domains.map((domain) => domain.domain === 'publication_bias'
        ? { ...domain, concern: 'unable_to_assess' as const }
        : domain),
    },
  };
  const message = claimDraftActionMessage(body);
  assert.match(message, /снизит уверенность/);
  assert.doesNotMatch(message, /закрыт/);
});
