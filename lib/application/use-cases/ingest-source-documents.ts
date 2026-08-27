import type { SourceDocumentCoverage } from '../../domain/index.ts';
import type { ScientificSourceDocumentLoader } from '../ports/scientific-source-document-loader.ts';
import type { SourceDocumentStore } from '../ports/source-document-store.ts';

interface IngestionDependencies {
  loader: ScientificSourceDocumentLoader;
  store: SourceDocumentStore;
}

export async function ingestSourceDocuments(
  externalIds: string[],
  dependencies: IngestionDependencies,
): Promise<SourceDocumentCoverage> {
  const uniqueIds = [...new Set(externalIds)].slice(0, 10);
  if (uniqueIds.length === 0) return { requested: 0, stored: 0, abstractOnly: 0, unavailable: 0 };
  const documents = await dependencies.loader.load(uniqueIds);
  await dependencies.store.saveAll(documents);
  return {
    requested: uniqueIds.length,
    stored: documents.length,
    abstractOnly: documents.filter((document) => document.contentLevel === 'abstract_only').length,
    unavailable: uniqueIds.length - documents.length,
  };
}
