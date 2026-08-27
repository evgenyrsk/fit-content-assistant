import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ManualPdfImportReceipt, ManualPdfImportRecord } from '../../domain/index.ts';
import { importManualPdf } from './import-manual-pdf.ts';

const input = {
  bytes: new TextEncoder().encode('%PDF-test'), originalFilename: 'study.pdf',
  title: 'Strength study', doi: '10.1000/test', pmid: '12345',
  rightsBasis: 'purchased_copy' as const,
  rightsAttestedAt: '2026-08-27T12:00:00.000Z', importedAt: '2026-08-27T12:00:00.000Z',
};

function long(value: string): string {
  return `${value}\n${'Evidence text with enough detail. '.repeat(28)}`;
}

test('stores a traceable user-authorized PDF and opens triage only with Methods and Results', async () => {
  let stored: ManualPdfImportRecord | undefined;
  let objectKey = '';
  let uploadedBytes = 0;
  const result = await importManualPdf(input, {
    createId: (() => { let value = 0; return () => `id-${++value}`; })(),
    extractor: { extract: async () => ({ totalPages: 3, pages: [long('Abstract'), long('Methods'), long('Results')] }) },
    repository: { findByContentHash: async () => null, save: async (record) => { stored = record; } },
    fileStore: { put: async (key, bytes) => { objectKey = key; uploadedBytes = bytes.byteLength; }, delete: async () => undefined },
  });
  assert.equal(result.processingStatus, 'ready_for_triage');
  assert.equal(result.duplicate, false);
  assert.equal(stored?.intakeDecision.decision, 'admitted_to_triage');
  assert.deepEqual(stored?.document.chunks.map((chunk) => chunk.kind), ['abstract', 'methods', 'results']);
  assert.equal(stored?.document.reuseRights?.origin, 'user_authorized_upload');
  assert.equal(stored?.byteSize, input.bytes.byteLength);
  assert.equal(uploadedBytes, input.bytes.byteLength);
  assert.match(objectKey, /^sources\/[a-f0-9]{64}\.pdf$/);
});

test('keeps an extracted PDF in review when Methods or Results cannot be located', async () => {
  let stored: ManualPdfImportRecord | undefined;
  const result = await importManualPdf({ ...input, bytes: new TextEncoder().encode('%PDF-incomplete') }, {
    extractor: { extract: async () => ({ totalPages: 2, pages: [long('Introduction'), long('Discussion')] }) },
    repository: { findByContentHash: async () => null, save: async (record) => { stored = record; } },
    fileStore: { put: async () => undefined, delete: async () => undefined },
  });
  assert.equal(result.processingStatus, 'structure_review_required');
  assert.deepEqual(stored?.intakeDecision.reasons, [
    'manual_pdf_uploaded_requires_review', 'manual_pdf_sections_incomplete',
  ]);
});

test('does not parse or store duplicate bytes', async () => {
  const existing: ManualPdfImportReceipt = {
    importId: 'existing', sourceId: 'upload:existing', title: 'Existing', fileName: 'existing.pdf',
    pageCount: 10, extractedCharacters: 5000, processingStatus: 'ready_for_triage', duplicate: false,
  };
  let parsed = false;
  let uploaded = false;
  const result = await importManualPdf(input, {
    extractor: { extract: async () => { parsed = true; return { totalPages: 0, pages: [] }; } },
    repository: { findByContentHash: async () => existing, save: async () => undefined },
    fileStore: { put: async () => { uploaded = true; }, delete: async () => undefined },
  });
  assert.equal(result.duplicate, true);
  assert.equal(parsed, false);
  assert.equal(uploaded, false);
});

test('deletes the uploaded object when metadata persistence fails', async () => {
  let deleted = '';
  await assert.rejects(() => importManualPdf(input, {
    extractor: { extract: async () => ({ totalPages: 3, pages: [long('Methods'), long('Results')] }) },
    repository: { findByContentHash: async () => null, save: async () => { throw new Error('D1 failed'); } },
    fileStore: { put: async () => undefined, delete: async (key) => { deleted = key; } },
  }), /D1 failed/);
  assert.match(deleted, /^sources\/[a-f0-9]{64}\.pdf$/);
});
