import type { ScientificSourceDocument, SourceChunkKind, SourceDocumentChunk } from '../../domain/index.ts';

const kindLimits: Array<[SourceChunkKind, number]> = [
  ['results', 5], ['methods', 5], ['abstract', 1], ['discussion', 1],
];
const maximumCharacters = 32_000;
const maximumCharactersPerPassage = 3_500;

function prioritized(chunks: SourceDocumentChunk[]): SourceDocumentChunk[] {
  const selected = kindLimits.flatMap(([kind, limit]) => chunks.filter((item) => item.kind === kind).slice(0, limit));
  const selectedIds = new Set(selected.map((item) => item.id));
  const remaining = chunks.filter((item) => !selectedIds.has(item.id));
  return [...selected, ...remaining].slice(0, 12);
}

export function selectAssessmentPassages(document: ScientificSourceDocument): ScientificSourceDocument {
  let remaining = maximumCharacters;
  const chunks = prioritized(document.chunks).flatMap((chunk) => {
    if (remaining <= 0) return [];
    const text = chunk.text.slice(0, Math.min(maximumCharactersPerPassage, remaining));
    remaining -= text.length;
    return text.trim().length >= 3 ? [{ ...chunk, text }] : [];
  });
  return { ...document, chunks };
}
