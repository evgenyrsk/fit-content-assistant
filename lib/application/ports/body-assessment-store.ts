import type { BodyAssessmentRecord } from '../../domain/index.ts';

export interface BodyAssessmentStore {
  save(record: BodyAssessmentRecord): Promise<void>;
}
