import type { ManualPdfImportReceipt, ManualPdfImportRecord } from '../../domain/index.ts';

export interface ManualSourceImportRepository {
  findByContentHash(contentSha256: string): Promise<ManualPdfImportReceipt | null>;
  save(record: ManualPdfImportRecord): Promise<void>;
}
