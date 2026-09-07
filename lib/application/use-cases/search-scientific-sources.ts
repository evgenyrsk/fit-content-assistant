import type { ResearchSearchResult, ScientificSourceCandidate, ScientificSourceProvider } from '../../domain/index.ts';
import type { ResearchRunStore } from '../ports/research-run-store';
import type { ScientificSourceSearch } from '../ports/scientific-source-search';
import { rankScientificCandidates, type ScientificRetrievalFocus } from './rank-scientific-candidates.ts';

interface SearchDependencies {
  searches: ScientificSourceSearch[];
  store?: ResearchRunStore;
  retrievalQuery?: string;
  fallbackRetrievalQuery?: string;
  retrievalFocus?: ScientificRetrievalFocus;
  candidatePoolMultiplier?: number;
  now?: () => Date;
  createId?: () => string;
}

interface ProviderResults {
  groups: Map<ScientificSourceProvider, ScientificSourceCandidate[]>;
  searched: ScientificSourceProvider[];
  unavailable: ScientificSourceProvider[];
}

function sourceKey(source: ScientificSourceCandidate): string {
  return source.doi?.toLowerCase() ?? source.pmid ?? `${source.title.toLowerCase()}|${source.publishedAt ?? ''}`;
}

function mergeCandidates(groups: ScientificSourceCandidate[][]): ScientificSourceCandidate[] {
  const merged = new Map<string, ScientificSourceCandidate>();
  for (const group of groups) {
    for (const source of group) {
      const key = sourceKey(source);
      const previous = merged.get(key);
      merged.set(key, previous ? { ...source, ...previous, doi: previous.doi ?? source.doi, pmid: previous.pmid ?? source.pmid } : source);
    }
  }
  return [...merged.values()];
}

function providerCandidates(
  groups: Map<ScientificSourceProvider, ScientificSourceCandidate[]>,
  provider: ScientificSourceProvider,
): ScientificSourceCandidate[] {
  return groups.get(provider) ?? [];
}

function candidateGroups(
  groups: Map<ScientificSourceProvider, ScientificSourceCandidate[]>,
  fallbackPubmed: ScientificSourceCandidate[],
): ScientificSourceCandidate[][] {
  const primaryPubmed = providerCandidates(groups, 'pubmed');
  if (fallbackPubmed.length === 0) return [primaryPubmed, providerCandidates(groups, 'crossref')];
  return [primaryPubmed, fallbackPubmed, providerCandidates(groups, 'crossref')];
}

async function collectProviderResults(query: string, limit: number, searches: ScientificSourceSearch[]): Promise<ProviderResults> {
  const settled = await Promise.allSettled(searches.map((search) => search.search({ query, limit })));
  const result: ProviderResults = { groups: new Map(), searched: [], unavailable: [] };
  settled.forEach((outcome, index) => {
    const provider = searches[index].provider;
    if (outcome.status === 'fulfilled') {
      result.searched.push(provider);
      result.groups.set(provider, outcome.value);
    } else result.unavailable.push(provider);
  });
  return result;
}

async function collectPubmedFallback(
  retrievalQuery: string, limit: number, dependencies: SearchDependencies,
): Promise<ScientificSourceCandidate[]> {
  const query = dependencies.fallbackRetrievalQuery?.trim();
  const provider = dependencies.searches.find((search) => search.provider === 'pubmed');
  if (!provider || !query || query === retrievalQuery) return [];
  try { return await provider.search({ query, limit }); } catch { return []; }
}

function reconcileProviders(primary: ProviderResults, fallback: ScientificSourceCandidate[]): ProviderResults {
  if (fallback.length === 0) return primary;
  return {
    groups: primary.groups,
    searched: [...new Set([...primary.searched, 'pubmed' as const])],
    unavailable: primary.unavailable.filter((provider) => provider !== 'pubmed'),
  };
}

function researchWarnings(
  fallback: ScientificSourceCandidate[], unavailable: ScientificSourceProvider[], reranked: boolean,
): string[] {
  const warnings = ['Найденные публикации — кандидаты, а не подтверждённые выводы.'];
  if (fallback.length > 0) warnings.push('PubMed-поиск дополнен более широким детерминированным запросом.');
  if (reranked) warnings.push('Кандидаты приоритизированы по вмешательству, исходам, популяции и типу исследования.');
  if (unavailable.length > 0) warnings.push('Часть источников временно недоступна.');
  return warnings;
}

async function persistSearch(result: ResearchSearchResult, store?: ResearchRunStore): Promise<void> {
  if (store) await store.saveSearch(result);
}

export async function searchScientificSources(
  query: string,
  limit: number,
  dependencies: SearchDependencies,
): Promise<ResearchSearchResult> {
  const retrievalQuery = dependencies.retrievalQuery ?? query;
  const poolMultiplier = Math.max(1, Math.min(4, dependencies.candidatePoolMultiplier ?? 3));
  const poolLimit = limit * poolMultiplier;
  const primary = await collectProviderResults(retrievalQuery, poolLimit, dependencies.searches);
  const fallbackPubmed = await collectPubmedFallback(retrievalQuery, poolLimit, dependencies);
  const providers = reconcileProviders(primary, fallbackPubmed);
  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const pool = mergeCandidates(candidateGroups(primary.groups, fallbackPubmed));
  const focus = dependencies.retrievalFocus ?? { question: retrievalQuery };
  const candidates = rankScientificCandidates(pool, focus, limit);
  const result: ResearchSearchResult = {
    runId: (dependencies.createId ?? (() => crypto.randomUUID()))(),
    query,
    status: candidates.length > 0 ? 'needs_review' : 'failed',
    candidates,
    searchedProviders: providers.searched,
    unavailableProviders: providers.unavailable,
    warnings: researchWarnings(fallbackPubmed, providers.unavailable, pool.length > limit),
    completedAt: now,
  };
  await persistSearch(result, dependencies.store);
  return result;
}
