import type { ManualPdfExtraction } from '../../domain/index.ts';

export interface ManualPdfTextExtractor {
  extract(bytes: Uint8Array): Promise<ManualPdfExtraction>;
}
