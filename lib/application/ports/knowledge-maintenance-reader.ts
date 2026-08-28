import type { KnowledgeMaintenanceResult } from '../../domain/index.ts';

export interface KnowledgeMaintenanceReader {
  inspect(now: string): Promise<KnowledgeMaintenanceResult>;
}
