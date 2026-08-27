import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { importManualPdf } from '@/lib/application/use-cases/import-manual-pdf';
import type { ManualPdfRightsBasis } from '@/lib/domain';
import { D1ManualSourceImportRepository } from '@/lib/infrastructure/d1/d1-manual-source-import-repository';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensurePipelineSchema } from '@/lib/infrastructure/d1/ensure-pipeline-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';
import { UnpdfTextExtractor } from '@/lib/infrastructure/pdf/unpdf-text-extractor';
import { R2SourceFileStore } from '@/lib/infrastructure/r2/r2-source-file-store';

const maximumPdfBytes = 15 * 1024 * 1024;
const rightsBases = new Set<ManualPdfRightsBasis>([
  'open_access', 'author_copy', 'institutional_access', 'purchased_copy', 'other_lawful_access',
]);

interface RuntimeBindings {
  DB?: D1Database | string;
  SOURCE_FILES?: R2Bucket | string;
}

function bindings(): { database: D1Database; bucket: R2Bucket } | null {
  const runtime = env as unknown as RuntimeBindings;
  if (!runtime.DB || typeof runtime.DB === 'string') return null;
  if (!runtime.SOURCE_FILES || typeof runtime.SOURCE_FILES === 'string') return null;
  return { database: runtime.DB, bucket: runtime.SOURCE_FILES };
}

function optionalText(form: FormData, key: string, maximum: number): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maximum) : undefined;
}

function rightsBasis(form: FormData): ManualPdfRightsBasis | null {
  const value = form.get('rightsBasis');
  return typeof value === 'string' && rightsBases.has(value as ManualPdfRightsBasis)
    ? value as ManualPdfRightsBasis
    : null;
}

function validPdf(file: File, bytes: Uint8Array): boolean {
  const signature = new TextDecoder().decode(bytes.slice(0, 5));
  return file.name.toLowerCase().endsWith('.pdf') && signature === '%PDF-';
}

function extractionMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('pdf_page_limit_exceeded')) return 'PDF превышает лимит в 100 страниц.';
  if (message.includes('pdf_extraction_timeout')) return 'PDF слишком сложный для безопасной обработки.';
  return 'Не удалось прочитать PDF. Попробуйте другую версию файла.';
}

interface ValidatedUpload {
  form: FormData;
  file: File;
  bytes: Uint8Array;
  basis: ManualPdfRightsBasis;
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

async function validatedUpload(request: Request): Promise<ValidatedUpload | Response> {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !form) return badRequest('Выберите PDF-файл.');
  if (file.size < 5 || file.size > maximumPdfBytes) return badRequest('Размер PDF должен быть не больше 15 МБ.');
  const basis = rightsBasis(form);
  if (!basis || form.get('rightsAttested') !== 'true') return badRequest('Подтвердите законный доступ к документу.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validPdf(file, bytes)) return badRequest('Файл не похож на корректный PDF.');
  return { form, file, bytes, basis };
}

export async function POST(request: Request): Promise<Response> {
  const runtime = bindings();
  if (!runtime) return Response.json({ error: 'Хранилище PDF пока недоступно.' }, { status: 503 });
  const upload = await validatedUpload(request);
  if (upload instanceof Response) return upload;
  const { form, file, bytes, basis } = upload;
  try {
    await ensureResearchSchema(runtime.database);
    await ensureEvidenceSchema(runtime.database);
    await ensurePipelineSchema(runtime.database);
    const importedAt = new Date().toISOString();
    const result = await importManualPdf({
      bytes, originalFilename: file.name.slice(0, 240), title: optionalText(form, 'title', 500),
      doi: optionalText(form, 'doi', 200), pmid: optionalText(form, 'pmid', 32),
      rightsBasis: basis, rightsAttestedAt: importedAt, importedAt,
    }, {
      extractor: new UnpdfTextExtractor(),
      repository: new D1ManualSourceImportRepository(runtime.database),
      fileStore: new R2SourceFileStore(runtime.bucket),
    });
    return Response.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return Response.json({ error: extractionMessage(error) }, { status: 422 });
  }
}

export { maximumPdfBytes };
