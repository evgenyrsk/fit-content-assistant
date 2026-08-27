import type { LlmProviderId } from '../ports/llm-provider';
import type { PipelineStageId } from './pipeline';

export interface ModelRunRecord {
  runId: string;
  stage: PipelineStageId;
  provider: LlmProviderId;
  model: string;
  routedProvider?: string;
  promptVersion: string;
  startedAt: string;
  retrievedIds: string[];
  toolCalls: string[];
  decision: 'approved' | 'needs_review' | 'rejected';
}
