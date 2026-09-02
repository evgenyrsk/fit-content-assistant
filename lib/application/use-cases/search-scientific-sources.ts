import type { ResearchSearchResult, ScientificSourceCandidate, ScientificSourceProvider } from '../../domain/index.ts';
import type { ResearchRunStore } from '../ports/research-run-store';
import type { ScientificSourceSearch } from '../ports/scientific-source-search';

interface SearchDependencies {
  searches: ScientificSourceSearch[];
  store?: ResearchRunStore;
  retrievalQuery?: string;
  fallbackRetrievalQuery?: string;
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

function mergeCandidates(groups: ScientificSourceCandidate[][], limit: number): ScientificSourceCandidate[] {
  const merged = new Map<string, ScientificSourceCandidate>();
  for (const group of groups) {
    for (const source of group) {
      const key = sourceKey(source);
      const previous = merged.get(key);
      merged.set(key, previous ? { ...source, ...previous, doi: previous.doi ?? source.doi, pmid: previous.pmid ?? source.pmid } : source);
    }
  }
  return [...merged.values()].slice(0, limit);
}

function providerCandidates(
  groups: Map<ScientificSourceProvider, ScientificSourceCandidate[]>,
  provider: ScientificSourceProvider,
): ScientificSourceCandidate[] {
  return groups.get(provider) ?? [];
}

function balancedGroups(
  groups: Map<ScientificSourceProvider, ScientificSourceCandidate[]>,
  fallbackPubmed: ScientificSourceCandidate[],
  limit: number,
): ScientificSourceCandidate[][] {
  const primaryPubmed = providerCandidates(groups, 'pubmed');
  if (fallbackPubmed.length === 0) return [primaryPubmed, providerCandidates(groups, 'crossref')];
  const primaryQuota = Math.max(1, Math.ceil(limit * 0.6));
  return [
    primaryPubmed.slice(0, primaryQuota), fallbackPubmed,
    primaryPubmed.slice(primaryQuota), providerCandidates(groups, 'crossref'),
  ];
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

function researchWarnings(fallback: ScientificSourceCandidate[], unavailable: ScientificSourceProvider[]): string[] {
  const warnings = ['Найденные публикации — кандидаты, а не подтверждённые выводы.'];
  if (fallback.length > 0) warnings.push('PubMed-поиск дополнен более широким детерминированным запросом.');
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
  const primary = await collectProviderResults(retrievalQuery, limit, dependencies.searches);
  const fallbackPubmed = await collectPubmedFallback(retrievalQuery, limit, dependencies);
  const providers = reconcileProviders(primary, fallbackPubmed);
  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const candidates = mergeCandidates(balancedGroups(primary.groups, fallbackPubmed, limit), limit);
  const result: ResearchSearchResult = {
    runId: (dependencies.createId ?? (() => crypto.randomUUID()))(),
    query,
    status: candidates.length > 0 ? 'needs_review' : 'failed',
    candidates,
    searchedProviders: providers.searched,
    unavailableProviders: providers.unavailable,
    warnings: researchWarnings(fallbackPubmed, providers.unavailable),
    completedAt: now,
  };
  await persistSearch(result, dependencies.store);
  return result;
}
