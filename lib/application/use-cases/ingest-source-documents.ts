import { evaluateSourceIntake, type SourceDocumentCoverage } from '../../domain/index.ts';
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
  if (uniqueIds.length === 0) {
    return { requested: 0, fetched: 0, stored: 0, abstractOnly: 0, rejected: 0, unavailable: 0, decisions: [] };
  }
  const documents = await dependencies.loader.load(uniqueIds);
  const decisions = documents.map(evaluateSourceIntake);
  const admittedIds = new Set(decisions
    .filter((decision) => decision.decision === 'admitted_to_triage')
    .map((decision) => decision.sourceId));
  const admitted = documents.filter((document) => admittedIds.has(document.sourceId));
  await dependencies.store.saveAll(admitted);
  return {
    requested: uniqueIds.length,
    fetched: documents.length,
    stored: admitted.length,
    abstractOnly: admitted.filter((document) => document.contentLevel === 'abstract_only').length,
    rejected: decisions.filter((decision) => decision.decision === 'rejected').length,
    unavailable: uniqueIds.length - documents.length,
    decisions,
  };
}
