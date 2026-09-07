export interface OperationsHealth {
  status: 'healthy' | 'attention_required';
  modelRuns24h: number;
  incompleteModelRuns24h: number;
  modelCostUsd24h: number;
  dueSourceRevalidations: number;
  latestAuditAt?: string;
  generatedAt: string;
  objectives: {
    availabilityTarget: '99.5% monthly';
    apiLatencyTarget: '< 3s excluding external LLM/research providers';
    integrityTarget: '0 unsupported factual publications';
  };
}

export function operationsHealthStatus(
  incompleteModelRuns: number,
  dueSourceRevalidations: number,
): OperationsHealth['status'] {
  return incompleteModelRuns > 0 || dueSourceRevalidations > 0 ? 'attention_required' : 'healthy';
}
