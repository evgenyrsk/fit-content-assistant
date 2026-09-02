import type {
  SourceAssessmentHumanReview,
  SourceAssessmentReviewContext,
} from '../../domain/index.ts';

export interface SourceAssessmentReviewRepository {
  findContext(assessmentId: string): Promise<SourceAssessmentReviewContext | null>;
  save(review: SourceAssessmentHumanReview): Promise<void>;
}
