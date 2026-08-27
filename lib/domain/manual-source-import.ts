import type { ScientificSourceDocument, SourceIntakeDecision } from './source-document.ts';

export type ManualPdfRightsBasis =
  | 'open_access'
  | 'author_copy'
  | 'institutional_access'
  | 'purchased_copy'
  | 'other_lawful_access';

export type ManualPdfProcessingStatus =
  | 'ready_for_triage'
  | 'structure_review_required'
  | 'text_unavailable';

export interface ManualPdfExtraction {
  totalPages: number;
  title?: string;
  pages: string[];
}

export interface ManualPdfImportInput {
  bytes: Uint8Array;
  originalFilename: string;
  title?: string;
  doi?: string;
  pmid?: string;
  rightsBasis: ManualPdfRightsBasis;
  rightsAttestedAt: string;
  importedAt: string;
}

export interface ManualPdfImportRecord {
  id: string;
  sourceId: string;
  researchRunId: string;
  objectKey: string;
  originalFilename: string;
  contentSha256: string;
  byteSize: number;
  pageCount: number;
  extractedCharacters: number;
  rightsBasis: ManualPdfRightsBasis;
  rightsAttestedAt: string;
  uploadedAt: string;
  processingStatus: ManualPdfProcessingStatus;
  document: ScientificSourceDocument;
  intakeDecision: SourceIntakeDecision;
}

export interface ManualPdfImportReceipt {
  importId: string;
  sourceId: string;
  title: string;
  fileName: string;
  pageCount: number;
  extractedCharacters: number;
  processingStatus: ManualPdfProcessingStatus;
  duplicate: boolean;
}
