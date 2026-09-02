import type { KnowledgeClaimRecord } from '../../domain/index.ts';

export interface KnowledgeClaimReader {
  listLatest(limit: number): Promise<KnowledgeClaimRecord[]>;
  listApproved(limit: number, checkedAt: string): Promise<KnowledgeClaimRecord[]>;
  listApprovedByIds(ids: string[], checkedAt: string): Promise<KnowledgeClaimRecord[]>;
}
