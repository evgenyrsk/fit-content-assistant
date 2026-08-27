import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnpdfTextExtractor } from './unpdf-text-extractor.ts';

function testPdf(): Uint8Array {
  const content = 'BT /F1 12 Tf 72 720 Td (Methods: controlled protocol.) Tj 0 -24 Td (Results: strength improved.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

test('extracts page-level text from a serverless-safe PDF', async () => {
  const extraction = await new UnpdfTextExtractor().extract(testPdf());
  assert.equal(extraction.totalPages, 1);
  assert.equal(extraction.pages.length, 1);
  assert.match(extraction.pages[0] ?? '', /Methods/);
  assert.match(extraction.pages[0] ?? '', /Results/);
});
