const longScientificStages: readonly string[] = [
  'source_assessment',
  'body_assessment',
  'claim_synthesis',
  'claim_review',
];

export function llmRequestTimeoutMs(stage: string, defaultMs: number): number {
  return longScientificStages.includes(stage) ? 120_000 : defaultMs;
}
