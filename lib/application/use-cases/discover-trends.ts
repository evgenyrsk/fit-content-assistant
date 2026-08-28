import type { TrendCandidate, TrendDiscoveryResult, TrendSource } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../ports/trend-provider';
import type { TrendSignalStore } from '../ports/trend-signal-store';

interface TrendDependencies {
  providers: TrendProvider[];
  expectedSources?: TrendSource[];
  sourceNotices?: Partial<Record<TrendSource, string>>;
  store?: TrendSignalStore;
  now?: () => Date;
}

function rank(candidate: TrendCandidate): number {
  const freshness = Math.max(0, 1 - candidate.freshnessMinutes / 1440);
  return candidate.audienceFit * 0.4 + candidate.scientificResearchability * 0.35 + freshness * 0.2 - candidate.saturationRisk * 0.05;
}

function resultStatus(candidateCount: number, activeSourceCount: number): TrendDiscoveryResult['status'] {
  if (candidateCount > 0) return 'live';
  return activeSourceCount > 0 ? 'empty' : 'unavailable';
}

function resultMessage(status: TrendDiscoveryResult['status']): string {
  if (status === 'live') return 'Сигналы актуальности получены в реальном времени; научная достоверность ещё не оценена.';
  if (status === 'empty') return 'Источник подключён, но свежих подходящих сигналов сейчас не найдено.';
  return 'Live-источник недоступен или требует подключения.';
}

export async function discoverTrends(
  request: TrendDiscoveryRequest,
  dependencies: TrendDependencies,
): Promise<TrendDiscoveryResult> {
  const settled = await Promise.allSettled(dependencies.providers.map((provider) => provider.discover(request)));
  const candidates: TrendCandidate[] = [];
  const activeSources: TrendSource[] = [];
  const unavailableSources: TrendSource[] = [];
  const sourceErrors: Partial<Record<TrendSource, string>> = {};
  settled.forEach((outcome, index) => {
    const source = dependencies.providers[index].source;
    if (outcome.status === 'fulfilled') {
      activeSources.push(source);
      candidates.push(...outcome.value);
    } else {
      unavailableSources.push(source);
      sourceErrors[source] = outcome.reason instanceof Error ? outcome.reason.message : 'Источник недоступен.';
    }
  });
  for (const source of dependencies.expectedSources ?? []) {
    if (!activeSources.includes(source) && !unavailableSources.includes(source)) unavailableSources.push(source);
  }
  const ranked = candidates.sort((left, right) => rank(right) - rank(left)).slice(0, request.limit);
  const refreshedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  await dependencies.store?.save(ranked, refreshedAt);
  const status = resultStatus(ranked.length, activeSources.length);
  return {
    candidates: ranked,
    activeSources,
    unavailableSources,
    sourceErrors,
    sourceNotices: dependencies.sourceNotices ?? {},
    status,
    message: resultMessage(status),
    refreshedAt,
  };
}
