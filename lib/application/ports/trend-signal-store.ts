import type { TrendCandidate } from '../../domain/index.ts';

export interface TrendSignalStore {
  save(candidates: TrendCandidate[], createdAt: string): Promise<void>;
}
