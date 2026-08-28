import type { KnowledgeSearchResult } from '../../domain/index.ts';

export interface KnowledgeSearchReader {
  search(query: string, limit: number): Promise<KnowledgeSearchResult>;
}
