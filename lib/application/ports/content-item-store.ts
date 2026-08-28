import type { ContentItemRecord } from '../../domain/index.ts';

export interface ContentItemStore {
  save(record: ContentItemRecord): Promise<void>;
}
