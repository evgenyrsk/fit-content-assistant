import type { FullTextCoverage, ScientificSourceDocument } from '../../domain/index.ts';
import { hasAssessmentGradeProvenance } from '../../domain/index.ts';
import type { SourceDocumentStore } from '../ports/source-document-store.ts';

function reusable(document: ScientificSourceDocument | null): document is ScientificSourceDocument {
  return Boolean(document && document.recordStatus === 'active'
    && document.reuseRights && ['permitted', 'user_attested'].includes(document.reuseRights.status)
    && hasAssessmentGradeProvenance(document));
}

export async function reuseStoredFullText(
  sourceIds: string[], coverage: FullTextCoverage, store: SourceDocumentStore,
): Promise<FullTextCoverage> {
  const known = new Set(coverage.documents.map((document) => document.sourceId));
  const documents = await Promise.all([...new Set(sourceIds)].slice(0, 10)
    .filter((sourceId) => !known.has(sourceId)).map((sourceId) => store.findById(sourceId)));
  const reused = documents.filter(reusable).flatMap((document) => document.pmcid && document.reuseRights
    ? [{
      sourceId: document.sourceId, pmcid: document.pmcid,
      license: document.reuseRights.license, chunkCount: document.chunks.length,
    }] : []);
  return {
    ...coverage,
    reused: reused.length,
    unavailable: Math.max(0, coverage.unavailable - reused.length),
    documents: [...coverage.documents, ...reused],
  };
}
