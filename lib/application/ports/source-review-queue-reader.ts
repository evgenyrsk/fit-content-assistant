import type { SourceReviewQueueItem } from '../../domain/index.ts';

export interface SourceReviewQueueReader {
  listLatest(limit: number): Promise<SourceReviewQueueItem[]>;
}
