import type { EvidenceRecordStatus } from './evidence-methodology.ts';
import type { ScientificSourceProvider } from './research.ts';

export type SourceContentLevel = 'metadata_only' | 'abstract_only' | 'full_text';
export type SourceChunkKind = 'abstract' | 'methods' | 'results' | 'discussion' | 'other';

export interface SourceDocumentChunk {
  id: string;
  sourceId: string;
  kind: SourceChunkKind;
  locator: string;
  text: string;
}

export interface ScientificSourceDocument {
  sourceId: string;
  provider: ScientificSourceProvider;
  externalId: string;
  title: string;
  doi?: string;
  pmid?: string;
  publicationTypes: string[];
  recordStatus: EvidenceRecordStatus;
  contentLevel: SourceContentLevel;
  chunks: SourceDocumentChunk[];
  fetchedAt: string;
}

export interface SourceDocumentCoverage {
  requested: number;
  stored: number;
  abstractOnly: number;
  unavailable: number;
}

export function hasAssessmentGradeProvenance(document: ScientificSourceDocument): boolean {
  return document.contentLevel === 'full_text' && document.chunks.length > 0;
}
