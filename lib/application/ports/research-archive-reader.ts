import type { ResearchArchiveItem } from '../../domain/index.ts';

export interface ResearchArchiveReader {
  listLatest(limit: number): Promise<ResearchArchiveItem[]>;
}
