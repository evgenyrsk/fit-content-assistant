import type { ResearchSearchResult, ScientificSourceCandidate, ScientificSourceProvider } from '../../domain/index.ts';
import type { ResearchRunStore } from '../ports/research-run-store';
import type { ScientificSourceSearch } from '../ports/scientific-source-search';

interface SearchDependencies {
  searches: ScientificSourceSearch[];
  store?: ResearchRunStore;
  retrievalQuery?: string;
  now?: () => Date;
  createId?: () => string;
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

export async function searchScientificSources(
  query: string,
  limit: number,
  dependencies: SearchDependencies,
): Promise<ResearchSearchResult> {
  const retrievalQuery = dependencies.retrievalQuery ?? query;
  const settled = await Promise.allSettled(dependencies.searches.map((search) => search.search({ query: retrievalQuery, limit })));
  const searchedProviders: ScientificSourceProvider[] = [];
  const unavailableProviders: ScientificSourceProvider[] = [];
  const groups: ScientificSourceCandidate[][] = [];
  settled.forEach((outcome, index) => {
    const provider = dependencies.searches[index].provider;
    if (outcome.status === 'fulfilled') {
      searchedProviders.push(provider);
      groups.push(outcome.value);
    } else {
      unavailableProviders.push(provider);
    }
  });
  const now = (dependencies.now ?? (() => new Date()))().toISOString();
  const candidates = mergeCandidates(groups, limit);
  const result: ResearchSearchResult = {
    runId: (dependencies.createId ?? (() => crypto.randomUUID()))(),
    query,
    status: candidates.length > 0 ? 'needs_review' : 'failed',
    candidates,
    searchedProviders,
    unavailableProviders,
    warnings: [
      'Найденные публикации — кандидаты, а не подтверждённые выводы.',
      ...(unavailableProviders.length > 0 ? ['Часть источников временно недоступна.'] : []),
    ],
    completedAt: now,
  };
  await dependencies.store?.saveSearch(result);
  return result;
}
