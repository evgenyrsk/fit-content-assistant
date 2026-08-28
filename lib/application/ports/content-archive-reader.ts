import type { ContentArchiveItem } from '../../domain/index.ts';

export interface ContentArchiveReader {
  listLatest(limit: number): Promise<ContentArchiveItem[]>;
}
