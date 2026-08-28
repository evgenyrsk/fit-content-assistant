import type { ReviewDecision } from './evidence.ts';

export type ContentFormat = 'reels' | 'telegram' | 'threads' | 'carousel';

export interface ContentBrief {
  format: ContentFormat;
  audience: string;
  coreIdea: string;
  tension: string;
  practicalValue: string;
  requiredClaimVersionIds: string[];
  requiredCaveats: string[];
  prohibitedFramings: string[];
  styleProfileVersion: string;
}

export interface ContentFragment {
  id: string;
  text: string;
  kind: 'fact' | 'opinion' | 'illustration' | 'transition' | 'cta';
  claimVersionIds: string[];
}

export interface ContentDraft {
  format: ContentFormat;
  title: string;
  fragments: ContentFragment[];
  reviewDecision: ReviewDecision;
  reviewNotes: string[];
}

export type ContentPipelineStage = 'content_brief' | 'platform_draft' | 'voice_edit' | 'fact_review';

export interface ContentStageState {
  stage: ContentPipelineStage;
  status: 'complete' | 'blocked' | 'waiting';
  message: string;
}

export interface ContentFactReview {
  decision: ReviewDecision;
  unsupportedFragmentIds: string[];
  preservedCaveats: string[];
  notes: string[];
}

export interface ContentItemRecord {
  id: string;
  brief: ContentBrief;
  draft: ContentDraft;
  factReview: ContentFactReview;
  status: 'ready_for_human_review' | 'needs_review';
  styleProfileFallback: boolean;
  createdAt: string;
}

export interface ContentPipelineResponse {
  status: 'awaiting_claims' | 'awaiting_provider' | 'needs_review' | 'ready_for_human_review';
  message: string;
  stages: ContentStageState[];
  contentItem: ContentItemRecord | null;
  publishable: false;
  reviewRequired: true;
}
