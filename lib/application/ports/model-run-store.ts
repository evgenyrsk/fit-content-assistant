import type { ModelRunRecord } from '../orchestration/model-run.ts';

export interface ModelRunStore {
  save(record: ModelRunRecord): Promise<void>;
}
