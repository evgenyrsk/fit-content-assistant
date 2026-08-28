import type {
  ContentOperationInput, ContentReviewInput, ManualContentInput,
} from '../../domain/index.ts';

export interface ContentOperationsStore {
  saveManual(input: ManualContentInput, now: string): Promise<{ id: string; version: number }>;
  review(input: ContentReviewInput, now: string): Promise<void>;
  updateOperation(input: ContentOperationInput, now: string): Promise<void>;
}
