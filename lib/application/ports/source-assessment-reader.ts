import type { SourceAssessmentSummary } from '../../domain/index.ts';

export interface SourceAssessmentReader {
  listForResearchRun(researchRunId: string): Promise<SourceAssessmentSummary[]>;
}
