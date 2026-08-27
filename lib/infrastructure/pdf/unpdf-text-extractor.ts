import { extractText, getDocumentProxy, getMeta } from 'unpdf';
import type { ManualPdfTextExtractor } from '../../application/ports/manual-pdf-text-extractor.ts';
import type { ManualPdfExtraction } from '../../domain/index.ts';

const maximumPdfPages = 100;
const extractionTimeoutMilliseconds = 12_000;

function metadataTitle(info: Record<string, unknown>): string | undefined {
  const title = info.Title;
  return typeof title === 'string' && title.trim() ? title.trim() : undefined;
}

async function withinTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('pdf_extraction_timeout')), extractionTimeoutMilliseconds);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function destroyDocument(document: unknown): Promise<void> {
  const candidate = document as { destroy?: () => Promise<void> };
  if (candidate.destroy) await candidate.destroy();
}

export class UnpdfTextExtractor implements ManualPdfTextExtractor {
  async extract(bytes: Uint8Array): Promise<ManualPdfExtraction> {
    const document = await getDocumentProxy(bytes, {
      isEvalSupported: false,
      maxImageSize: 16_777_216,
    } as never);
    try {
      if (document.numPages > maximumPdfPages) throw new Error('pdf_page_limit_exceeded');
      const [content, metadata] = await withinTimeout(
        Promise.all([extractText(document, { mergePages: false }), getMeta(document)]),
      );
      return {
        totalPages: content.totalPages,
        title: metadataTitle(metadata.info),
        pages: Array.isArray(content.text) ? content.text : [content.text],
      };
    } finally {
      await destroyDocument(document);
    }
  }
}

export { extractionTimeoutMilliseconds, maximumPdfPages };
