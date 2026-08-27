import type { SourceIntakeDecision } from '../../domain/index.ts';

export interface SourceIntakeDecisionStore {
  saveAll(researchRunId: string, decisions: SourceIntakeDecision[]): Promise<void>;
}
