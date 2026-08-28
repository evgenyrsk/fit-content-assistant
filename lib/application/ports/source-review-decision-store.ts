import type { HumanSourceReview, SourceReviewSubmission } from '../../domain/index.ts';

export interface SourceReviewDecisionStore {
  save(submission: SourceReviewSubmission, createdAt: string): Promise<HumanSourceReview>;
}
