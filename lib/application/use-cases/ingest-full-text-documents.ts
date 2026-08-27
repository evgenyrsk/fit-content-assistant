import type { FullTextCoverage } from '../../domain/index.ts';
import type { ScientificSourceDocumentLoader } from '../ports/scientific-source-document-loader.ts';
import type { SourceDocumentStore } from '../ports/source-document-store.ts';

interface FullTextIngestionDependencies {
  loader: ScientificSourceDocumentLoader;
  store: SourceDocumentStore;
}

export async function ingestFullTextDocuments(
  externalIds: string[],
  dependencies: FullTextIngestionDependencies,
): Promise<FullTextCoverage> {
  const uniqueIds = [...new Set(externalIds)].slice(0, 10);
  if (uniqueIds.length === 0) return { requested: 0, stored: 0, unavailable: 0, documents: [] };
  const documents = await dependencies.loader.load(uniqueIds);
  await dependencies.store.saveAll(documents);
  return {
    requested: uniqueIds.length,
    stored: documents.length,
    unavailable: uniqueIds.length - documents.length,
    documents: documents.flatMap((document) => document.pmcid && document.reuseRights
      ? [{
        sourceId: document.sourceId, pmcid: document.pmcid,
        license: document.reuseRights.license, chunkCount: document.chunks.length,
      }]
      : []),
  };
}
