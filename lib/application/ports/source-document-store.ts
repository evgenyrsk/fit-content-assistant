import type { ScientificSourceDocument } from '../../domain/index.ts';

export interface SourceDocumentStore {
  saveAll(documents: ScientificSourceDocument[]): Promise<void>;
  findById(sourceId: string): Promise<ScientificSourceDocument | null>;
}
