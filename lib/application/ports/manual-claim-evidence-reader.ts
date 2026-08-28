import type { ManualClaimReviewContext, ManualEvidenceOption } from '../../domain/index.ts';

export interface ManualClaimEvidenceReader {
  listEligible(limit: number): Promise<ManualEvidenceOption[]>;
  findReviewContext(claimVersionId: string): Promise<ManualClaimReviewContext | null>;
}
