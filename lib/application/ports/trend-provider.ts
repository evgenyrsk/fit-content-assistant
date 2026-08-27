import type { TrendCandidate, TrendSource } from '../../domain/index.ts';

export interface TrendDiscoveryRequest {
  query?: string;
  region: string;
  limit: number;
  signal?: AbortSignal;
}

export interface TrendProvider {
  readonly source: TrendSource;
  discover(request: TrendDiscoveryRequest): Promise<TrendCandidate[]>;
}
