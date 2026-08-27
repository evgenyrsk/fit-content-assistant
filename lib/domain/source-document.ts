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
  pmcid?: string;
  publicationTypes: string[];
  recordStatus: EvidenceRecordStatus;
  contentLevel: SourceContentLevel;
  chunks: SourceDocumentChunk[];
  reuseRights?: SourceReuseRights;
  fetchedAt: string;
}

export interface SourceReuseRights {
  status: 'permitted' | 'user_attested' | 'unknown';
  license: string;
  origin: 'pmc_open_access' | 'user_authorized_upload';
}

export interface SourceDocumentCoverage {
  requested: number;
  fetched: number;
  stored: number;
  abstractOnly: number;
  rejected: number;
  unavailable: number;
  decisions: SourceIntakeDecision[];
}

export interface FullTextCoverage {
  requested: number;
  stored: number;
  unavailable: number;
  documents: Array<{
    sourceId: string;
    pmcid: string;
    license: string;
    chunkCount: number;
  }>;
}

export type SourceIntakeDecisionType = 'admitted_to_triage' | 'rejected';

export type SourceIntakeReason =
  | 'eligible_abstract'
  | 'corrected_record_requires_review'
  | 'record_retracted'
  | 'record_expression_of_concern'
  | 'record_identity_unverified'
  | 'abstract_missing'
  | 'abstract_too_short'
  | 'non_research_publication'
  | 'manual_pdf_uploaded_requires_review'
  | 'manual_pdf_sections_incomplete'
  | 'manual_pdf_text_unavailable';

export interface SourceIntakeDecision {
  sourceId: string;
  decision: SourceIntakeDecisionType;
  reasons: SourceIntakeReason[];
  policyVersion: string;
  recordStatus: EvidenceRecordStatus;
  contentLevel: SourceContentLevel;
  publicationTypes: string[];
  abstractCharacters: number;
  evaluatedAt: string;
}

export function hasAssessmentGradeProvenance(document: ScientificSourceDocument): boolean {
  const kinds = new Set(document.chunks.map((chunk) => chunk.kind));
  return document.contentLevel === 'full_text' && kinds.has('methods') && kinds.has('results');
}
