import type {
  ManualPdfImportInput,
  ManualPdfImportReceipt,
  ManualPdfImportRecord,
  ManualPdfProcessingStatus,
  SourceChunkKind,
  SourceDocumentChunk,
  SourceIntakeReason,
} from '../../domain/index.ts';
import type { ManualPdfTextExtractor } from '../ports/manual-pdf-text-extractor.ts';
import type { ManualSourceImportRepository } from '../ports/manual-source-import-repository.ts';
import type { SourceFileStore } from '../ports/source-file-store.ts';

const minimumExtractedCharacters = 500;
const maximumChunkCharacters = 3_200;
const manualPdfPolicyVersion = 'manual-pdf-intake-v1';

export interface ImportManualPdfDependencies {
  extractor: ManualPdfTextExtractor;
  repository: ManualSourceImportRepository;
  fileStore: SourceFileStore;
  createId?: () => string;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const source = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', source);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cleanText(value: string): string {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function titleFrom(input: ManualPdfImportInput, extractedTitle?: string): string {
  const fallback = input.originalFilename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
  return cleanText(input.title ?? extractedTitle ?? fallback).slice(0, 500) || 'PDF без названия';
}

function chunkKind(text: string): SourceChunkKind {
  const start = text.slice(0, 600).toLocaleLowerCase('ru-RU');
  if (/\b(methods?|materials and methods|methodology)\b|\b(методы|методология|материалы и методы)\b/u.test(start)) return 'methods';
  if (/\b(results?|findings)\b|\b(результаты|полученные результаты)\b/u.test(start)) return 'results';
  if (/\b(discussion|conclusions?)\b|\b(обсуждение|выводы|заключение)\b/u.test(start)) return 'discussion';
  if (/\babstract\b|\bаннотация\b/u.test(start)) return 'abstract';
  return 'other';
}

function pageChunks(sourceId: string, pages: string[]): SourceDocumentChunk[] {
  return pages.flatMap((page, pageIndex) => {
    const text = cleanText(page);
    const chunks: SourceDocumentChunk[] = [];
    for (let start = 0, part = 1; start < text.length; start += maximumChunkCharacters, part += 1) {
      const value = text.slice(start, start + maximumChunkCharacters).trim();
      if (value.length < 40) continue;
      chunks.push({
        id: `${sourceId}:page-${pageIndex + 1}:part-${part}`,
        sourceId,
        kind: chunkKind(value),
        locator: `PDF page ${pageIndex + 1}, normalized characters ${start}-${start + value.length}`,
        text: value,
      });
    }
    return chunks;
  });
}

function processingStatus(chunks: SourceDocumentChunk[], extractedCharacters: number): ManualPdfProcessingStatus {
  if (extractedCharacters < minimumExtractedCharacters) return 'text_unavailable';
  const kinds = new Set(chunks.map((chunk) => chunk.kind));
  return kinds.has('methods') && kinds.has('results') ? 'ready_for_triage' : 'structure_review_required';
}

function intakeReasons(status: ManualPdfProcessingStatus): SourceIntakeReason[] {
  if (status === 'text_unavailable') return ['manual_pdf_text_unavailable'];
  return status === 'ready_for_triage'
    ? ['manual_pdf_uploaded_requires_review']
    : ['manual_pdf_uploaded_requires_review', 'manual_pdf_sections_incomplete'];
}

function receipt(record: ManualPdfImportRecord, duplicate: boolean): ManualPdfImportReceipt {
  return {
    importId: record.id, sourceId: record.sourceId, title: record.document.title,
    fileName: record.originalFilename, pageCount: record.pageCount,
    extractedCharacters: record.extractedCharacters,
    processingStatus: record.processingStatus, duplicate,
  };
}

export async function importManualPdf(
  input: ManualPdfImportInput,
  dependencies: ImportManualPdfDependencies,
): Promise<ManualPdfImportReceipt> {
  const contentSha256 = await sha256(input.bytes);
  const byteSize = input.bytes.byteLength;
  const duplicate = await dependencies.repository.findByContentHash(contentSha256);
  if (duplicate) return { ...duplicate, duplicate: true };
  const extraction = await dependencies.extractor.extract(input.bytes.slice());
  const sourceId = `upload:${contentSha256}`;
  const chunks = pageChunks(sourceId, extraction.pages);
  const extractedCharacters = chunks.reduce((total, chunk) => total + chunk.text.length, 0);
  const status = processingStatus(chunks, extractedCharacters);
  const createId = dependencies.createId ?? (() => crypto.randomUUID());
  const record: ManualPdfImportRecord = {
    id: createId(), sourceId, researchRunId: createId(), objectKey: `sources/${contentSha256}.pdf`,
    originalFilename: input.originalFilename, contentSha256, byteSize,
    pageCount: extraction.totalPages, extractedCharacters, rightsBasis: input.rightsBasis,
    rightsAttestedAt: input.rightsAttestedAt, uploadedAt: input.importedAt, processingStatus: status,
    document: {
      sourceId, provider: 'manual_pdf', externalId: contentSha256, title: titleFrom(input, extraction.title),
      doi: input.doi, pmid: input.pmid, publicationTypes: ['User supplied PDF'], recordStatus: 'unknown',
      contentLevel: status === 'text_unavailable' ? 'metadata_only' : 'full_text', chunks,
      reuseRights: { status: 'user_attested', license: input.rightsBasis, origin: 'user_authorized_upload' },
      fetchedAt: input.importedAt,
    },
    intakeDecision: {
      sourceId, decision: status === 'text_unavailable' ? 'rejected' : 'admitted_to_triage',
      reasons: intakeReasons(status), policyVersion: manualPdfPolicyVersion, recordStatus: 'unknown',
      contentLevel: status === 'text_unavailable' ? 'metadata_only' : 'full_text',
      publicationTypes: ['User supplied PDF'], abstractCharacters: 0, evaluatedAt: input.importedAt,
    },
  };
  await dependencies.fileStore.put(record.objectKey, input.bytes, {
    sourceId, contentSha256, rightsBasis: input.rightsBasis, originalFilename: input.originalFilename,
  });
  try {
    await dependencies.repository.save(record);
  } catch (error) {
    await dependencies.fileStore.delete(record.objectKey).catch(() => undefined);
    throw error;
  }
  return receipt(record, false);
}

export { manualPdfPolicyVersion, maximumChunkCharacters, minimumExtractedCharacters };
