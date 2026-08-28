import type { ManualClaimReviewRecord } from '../../domain/index.ts';

export interface ManualClaimReviewStore {
  save(record: ManualClaimReviewRecord): Promise<void>;
}
