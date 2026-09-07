import type { ScientificSourceCandidate } from '../../domain/index.ts';
import { buildScientificQuery } from './build-scientific-query.ts';

export interface ScientificRetrievalFocus {
  question: string;
  population?: string;
  intervention?: string | null;
  comparator?: string | null;
  outcomes?: string[];
}

interface ScoredCandidate {
  candidate: ScientificSourceCandidate;
  score: number;
  index: number;
}

const stopWords = new Set([
  'and', 'the', 'for', 'with', 'from', 'into', 'does', 'effect', 'effects', 'study',
  'review', 'analysis', 'adults', 'adult', 'healthy', 'people', 'versus', 'among',
]);

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\p{L}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function concepts(value: string | null | undefined): string[] {
  if (!value) return [];
  const translated = normalized(buildScientificQuery(value));
  const phrases = translated.split(/\s+(?:and|or|versus|vs)\s+|[,;/]+/u).map((item) => item.trim());
  const tokens = translated.split(' ').filter((token) => token.length > 3 && !stopWords.has(token));
  return [...new Set([...phrases.filter((item) => item.length > 3), ...tokens])];
}

function groupMatch(title: string, values: string[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values.map((value) => title.includes(value) ? Math.min(1, value.split(' ').length / 2) : 0));
}

function evidenceDesignScore(sourceType: string): number {
  const value = normalized(sourceType);
  if (/meta analysis|systematic review|practice guideline|guideline/.test(value)) return 2;
  if (/randomized|controlled trial|clinical trial/.test(value)) return 1;
  return 0;
}

export function scientificCandidateScore(
  candidate: ScientificSourceCandidate,
  focus: ScientificRetrievalFocus,
): number {
  const title = normalized(candidate.title);
  const intervention = concepts(focus.intervention);
  const outcomes = (focus.outcomes ?? []).flatMap(concepts);
  const comparator = concepts(focus.comparator);
  const population = concepts(focus.population);
  const question = concepts(focus.question);
  const interventionMatch = groupMatch(title, intervention);
  const outcomeMatch = groupMatch(title, outcomes);
  let score = groupMatch(title, question) * 2;
  score += interventionMatch * 6 + outcomeMatch * 7;
  score += groupMatch(title, comparator) * 2 + groupMatch(title, population);
  score += evidenceDesignScore(candidate.sourceType);
  if (intervention.length > 0 && interventionMatch === 0) score -= 4;
  if (outcomes.length > 0 && outcomeMatch === 0) score -= 6;
  if (interventionMatch > 0 && outcomeMatch > 0) score += 4;
  if (candidate.provider === 'pubmed') score += 0.25;
  return score;
}

export function rankScientificCandidates(
  candidates: ScientificSourceCandidate[],
  focus: ScientificRetrievalFocus,
  limit: number,
): ScientificSourceCandidate[] {
  return candidates
    .map((candidate, index): ScoredCandidate => ({ candidate, score: scientificCandidateScore(candidate, focus), index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
