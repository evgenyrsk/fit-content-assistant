import type { KnowledgeClaimRecord } from '../../domain/index.ts';

export interface KnowledgeClaimReader {
  listLatest(limit: number): Promise<KnowledgeClaimRecord[]>;
}
