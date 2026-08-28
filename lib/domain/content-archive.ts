import type { ContentFormat } from './content.ts';
import type { ContentOperation } from './content-operations.ts';

export interface ContentArchiveItem {
  id: string;
  format: ContentFormat;
  title: string;
  status: 'ready_for_human_review' | 'needs_review';
  styleProfileVersion: string;
  text: string;
  fragmentKind: 'fact' | 'opinion' | 'illustration' | 'transition' | 'cta';
  claimVersionIds: string[];
  fragmentCount: number;
  claimCount: number;
  versionCount: number;
  operation: ContentOperation;
  updatedAt: string;
}

export interface ContentArchiveResult {
  items: ContentArchiveItem[];
  canonical: true;
  generatedAt: string;
}
