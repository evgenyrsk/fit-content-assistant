import type { ScientificSourceCandidate, ScientificSourceProvider } from '../../domain/index.ts';

export interface ScientificSearchRequest {
  query: string;
  limit: number;
  signal?: AbortSignal;
}

export interface ScientificSourceSearch {
  readonly provider: ScientificSourceProvider;
  search(request: ScientificSearchRequest): Promise<ScientificSourceCandidate[]>;
}
