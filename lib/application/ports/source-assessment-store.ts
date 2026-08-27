import type { SourceAssessmentRecord } from '../../domain/index.ts';

export interface SourceAssessmentStore {
  save(record: SourceAssessmentRecord): Promise<void>;
}
