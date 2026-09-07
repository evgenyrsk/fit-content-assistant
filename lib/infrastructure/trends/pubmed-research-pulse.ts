import type { ScientificSourceCandidate, TrendCandidate } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../../application/ports/trend-provider.ts';
import { PubmedSearch } from '../scientific/pubmed-search.ts';
import { scoreAudienceFit } from './trend-scoring.ts';

interface PubmedPulseOptions {
  apiKey?: string;
  email?: string;
  search?: PubmedSearch;
  now?: () => Date;
}

function publicationTime(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  if (/^\d{4}$/.test(value.trim())) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? fallback : parsed;
}

export function mapPubmedPulse(sources: ScientificSourceCandidate[], now: Date): TrendCandidate[] {
  return sources.map((source) => {
    const observed = publicationTime(source.publishedAt, now);
    const freshnessMinutes = Math.max(0, Math.round((now.valueOf() - observed.valueOf()) / 60_000));
    return {
      id: `pubmed-pulse:${source.pmid ?? source.id}`,
      title: source.title,
      source: 'pubmed_pulse' as const,
      sourceLabel: 'PubMed · research pulse',
      url: source.url,
      observedAt: observed.toISOString(),
      freshnessMinutes,
      growthSignal: 'Недавняя научная публикация',
      audienceFit: scoreAudienceFit(source.title),
      scientificResearchability: 1,
      saturationRisk: 0.2,
      platforms: ['Research pulse'],
      status: freshnessMinutes <= 86_400 ? 'live' as const : 'stale' as const,
    };
  });
}

export function eligiblePubmedPulse(sources: ScientificSourceCandidate[], now: Date, limit: number): TrendCandidate[] {
  return mapPubmedPulse(sources, now)
    .filter((candidate) => candidate.status === 'live' && candidate.audienceFit >= 0.5)
    .slice(0, limit);
}

export class PubmedResearchPulse implements TrendProvider {
  readonly source = 'pubmed_pulse' as const;
  private readonly search: PubmedSearch;
  private readonly now: () => Date;

  constructor(options: PubmedPulseOptions = {}) {
    this.search = options.search ?? new PubmedSearch({ apiKey: options.apiKey, email: options.email });
    this.now = options.now ?? (() => new Date());
  }

  async discover(request: TrendDiscoveryRequest): Promise<TrendCandidate[]> {
    const topic = request.query?.trim() || '(resistance training OR exercise OR hypertrophy OR protein OR weight loss OR sleep)';
    const query = `${topic} AND ("last 60 days"[PDat])`;
    const sources = await this.search.search({ query, limit: request.limit, signal: request.signal });
    return eligiblePubmedPulse(sources, this.now(), request.limit);
  }
}
