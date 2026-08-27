import type { ScientificSourceDocument, SourceIntakeDecision, SourceIntakeReason } from './source-document.ts';

export const sourceIntakePolicyVersion = 'source-intake-v1';
export const minimumAbstractCharacters = 280;

const excludedPublicationTypes = new Set([
  'address', 'autobiography', 'bibliography', 'biography', 'comment', 'congress',
  'directory', 'editorial', 'festschrift', 'historical article', 'interview',
  'introductory journal article', 'letter', 'news', 'newspaper article',
  'patient education handout', 'portrait', 'published erratum', 'retraction notice',
]);

function abstractCharacters(document: ScientificSourceDocument): number {
  return document.chunks
    .filter((chunk) => chunk.kind === 'abstract')
    .map((chunk) => chunk.text.replace(/\s+/g, ' ').trim())
    .join(' ')
    .length;
}

function rejectionReasons(document: ScientificSourceDocument, characters: number): SourceIntakeReason[] {
  const reasons: SourceIntakeReason[] = [];
  if (document.recordStatus === 'retracted') reasons.push('record_retracted');
  if (document.recordStatus === 'expression_of_concern') reasons.push('record_expression_of_concern');
  if (!document.pmid || document.sourceId !== `pmid:${document.pmid}`) reasons.push('record_identity_unverified');
  if (document.contentLevel === 'metadata_only' || characters === 0) reasons.push('abstract_missing');
  else if (characters < minimumAbstractCharacters) reasons.push('abstract_too_short');
  if (document.publicationTypes.some((type) => excludedPublicationTypes.has(type.trim().toLowerCase()))) {
    reasons.push('non_research_publication');
  }
  return [...new Set(reasons)];
}

export function evaluateSourceIntake(document: ScientificSourceDocument): SourceIntakeDecision {
  const characters = abstractCharacters(document);
  const rejected = rejectionReasons(document, characters);
  const admitted = rejected.length === 0;
  return {
    sourceId: document.sourceId,
    decision: admitted ? 'admitted_to_triage' : 'rejected',
    reasons: admitted
      ? [document.recordStatus === 'corrected' ? 'corrected_record_requires_review' : 'eligible_abstract']
      : rejected,
    policyVersion: sourceIntakePolicyVersion,
    recordStatus: document.recordStatus,
    contentLevel: document.contentLevel,
    publicationTypes: document.publicationTypes,
    abstractCharacters: characters,
    evaluatedAt: document.fetchedAt,
  };
}
