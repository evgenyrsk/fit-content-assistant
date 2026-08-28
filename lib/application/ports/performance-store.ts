import type { PerformanceResult, PublicationMetricInput } from '../../domain/index.ts';

export interface PerformanceStore {
  list(now: string): Promise<PerformanceResult>;
  saveAll(metrics: PublicationMetricInput[], now: string): Promise<number>;
}
