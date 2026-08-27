import type { TrendCandidate, TrendDiscoveryResult, TrendSource } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../ports/trend-provider';
import type { TrendSignalStore } from '../ports/trend-signal-store';

interface TrendDependencies {
  providers: TrendProvider[];
  expectedSources?: TrendSource[];
  store?: TrendSignalStore;
  now?: () => Date;
}

function rank(candidate: TrendCandidate): number {
  const freshness = Math.max(0, 1 - candidate.freshnessMinutes / 1440);
  return candidate.audienceFit * 0.4 + candidate.scientificResearchability * 0.35 + freshness * 0.2 - candidate.saturationRisk * 0.05;
}

export async function discoverTrends(
  request: TrendDiscoveryRequest,
  dependencies: TrendDependencies,
): Promise<TrendDiscoveryResult> {
  const settled = await Promise.allSettled(dependencies.providers.map((provider) => provider.discover(request)));
  const candidates: TrendCandidate[] = [];
  const activeSources: TrendSource[] = [];
  const unavailableSources: TrendSource[] = [];
  settled.forEach((outcome, index) => {
    const source = dependencies.providers[index].source;
    if (outcome.status === 'fulfilled') {
      activeSources.push(source);
      candidates.push(...outcome.value);
    } else {
      unavailableSources.push(source);
    }
  });
  for (const source of dependencies.expectedSources ?? []) {
    if (!activeSources.includes(source) && !unavailableSources.includes(source)) unavailableSources.push(source);
  }
  const ranked = candidates.sort((left, right) => rank(right) - rank(left)).slice(0, request.limit);
  const refreshedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  await dependencies.store?.save(ranked, refreshedAt);
  return {
    candidates: ranked,
    activeSources,
    unavailableSources,
    status: ranked.length > 0 ? 'live' : 'unavailable',
    message: ranked.length > 0
      ? 'Сигналы актуальности получены в реальном времени; научная достоверность ещё не оценена.'
      : 'Подходящих live-сигналов сейчас нет или источникам требуется подключение.',
    refreshedAt,
  };
}
