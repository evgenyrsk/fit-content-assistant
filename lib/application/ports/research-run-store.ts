import type { ResearchSearchResult } from '../../domain/index.ts';

export interface ResearchRunStore {
  saveSearch(result: ResearchSearchResult): Promise<void>;
}
