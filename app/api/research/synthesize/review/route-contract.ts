import type { BodyAssessmentHumanReview } from '../../../../../lib/domain/index.ts';

export function bodyReviewResponse(review: BodyAssessmentHumanReview) {
  return {
    review,
    claimDraftGateOpened: review.decision === 'confirmed',
    claimApprovalOpened: false,
  } as const;
}
