import type { ContentFormat } from './content.ts';

export interface ContentArchiveItem {
  id: string;
  format: ContentFormat;
  title: string;
  status: 'ready_for_human_review' | 'needs_review';
  styleProfileVersion: string;
  fragmentCount: number;
  claimCount: number;
  updatedAt: string;
}

export interface ContentArchiveResult {
  items: ContentArchiveItem[];
  canonical: true;
  generatedAt: string;
}
