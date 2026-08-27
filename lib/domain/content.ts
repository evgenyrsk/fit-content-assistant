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
