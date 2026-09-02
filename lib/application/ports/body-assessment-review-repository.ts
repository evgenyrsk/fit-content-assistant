import type { BodyAssessmentHumanReview, BodyAssessmentReviewContext } from '../../domain/index.ts';

export interface BodyAssessmentReviewRepository {
  findContext(bodyAssessmentId: string): Promise<BodyAssessmentReviewContext | null>;
  save(review: BodyAssessmentHumanReview): Promise<void>;
}
