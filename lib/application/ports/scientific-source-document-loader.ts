import type { ScientificSourceDocument, ScientificSourceProvider } from '../../domain/index.ts';

export interface ScientificSourceDocumentLoader {
  readonly provider: ScientificSourceProvider;
  load(externalIds: string[]): Promise<ScientificSourceDocument[]>;
}
