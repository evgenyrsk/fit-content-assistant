import type { SourceRevalidationCandidate, SourceReviewQueueItem } from '../../domain/index.ts';

export interface SourceReviewQueueReader {
  listLatest(limit: number): Promise<SourceReviewQueueItem[]>;
  listDuePubmed(limit: number, now: string): Promise<SourceRevalidationCandidate[]>;
}
