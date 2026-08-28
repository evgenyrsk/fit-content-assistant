import type { TrendCandidate } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../../application/ports/trend-provider.ts';
import { scoreAudienceFit, scoreResearchability } from './trend-scoring.ts';
import { ThreadsProfileAccess, type ThreadsProfile } from './threads-profile-access.ts';

type Fetcher = typeof fetch;

interface ThreadsOptions {
  accessToken: string;
  apiVersion: string;
  fetcher?: Fetcher;
  now?: () => Date;
  profileAccess?: { fetchProfile(): Promise<ThreadsProfile> };
}

interface ThreadsPost {
  id?: string;
  text?: string;
  timestamp?: string;
  permalink?: string;
}

const russianQueries = ['мышцы', 'тренировка', 'похудение', 'сон', 'креатин', 'протеин'];
const englishQueries = ['muscle', 'workout', 'weight loss', 'sleep', 'creatine', 'protein'];
const liveWindowMinutes = 2_880;

function defaultQueries(region: string): string[] {
  return region.toUpperCase() === 'RU' ? russianQueries : englishQueries;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function parseThreadsPosts(payload: unknown, now: Date): TrendCandidate[] {
  const data = objectValue(payload).data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    const post = objectValue(raw) as ThreadsPost;
    if (!post.id || !post.text) return [];
    const title = post.text.replace(/\s+/g, ' ').trim().slice(0, 180);
    const timestamp = new Date(post.timestamp ?? now.toISOString());
    const observedAt = Number.isNaN(timestamp.valueOf()) ? now.toISOString() : timestamp.toISOString();
    const freshnessMinutes = Math.max(0, Math.round((now.valueOf() - new Date(observedAt).valueOf()) / 60_000));
    return [{
      id: `threads:${post.id}`,
      title,
      source: 'threads' as const,
      sourceLabel: 'Threads · keyword search',
      url: post.permalink,
      observedAt,
      freshnessMinutes,
      growthSignal: 'TOP Threads · последние 48 часов',
      audienceFit: scoreAudienceFit(title),
      scientificResearchability: scoreResearchability(title),
      saturationRisk: freshnessMinutes > 1440 ? 0.7 : 0.4,
      platforms: ['Threads'],
      status: freshnessMinutes <= 2880 ? 'live' as const : 'stale' as const,
    }];
  });
}

export class ThreadsKeywordSearch implements TrendProvider {
  readonly source = 'threads' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;
  private readonly options: ThreadsOptions;
  private readonly profileAccess: { fetchProfile(): Promise<ThreadsProfile> };

  constructor(options: ThreadsOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.profileAccess = options.profileAccess ?? new ThreadsProfileAccess({
      accessToken: options.accessToken,
      apiVersion: options.apiVersion,
      fetcher: this.fetcher,
    });
  }

  private async search(query: string, request: TrendDiscoveryRequest, now: Date): Promise<TrendCandidate[]> {
    const windowStart = new Date(now.valueOf() - liveWindowMinutes * 60_000);
    const parameters = new URLSearchParams({
      q: query,
      search_type: 'TOP',
      fields: 'id,text,timestamp,permalink,username',
      limit: String(Math.min(50, Math.max(18, request.limit * 3))),
      since: windowStart.toISOString(),
      until: now.toISOString(),
      access_token: this.options.accessToken,
    });
    const base = `https://graph.threads.net/${this.options.apiVersion}/keyword_search`;
    const response = await this.fetcher(`${base}?${parameters}`, { signal: request.signal });
    if (!response.ok) throw new Error(`Threads keyword search failed: ${response.status}`);
    return parseThreadsPosts(await response.json(), now);
  }

  async discover(request: TrendDiscoveryRequest): Promise<TrendCandidate[]> {
    await this.profileAccess.fetchProfile();
    const explicitQuery = request.query?.trim();
    const queries = explicitQuery ? [explicitQuery] : defaultQueries(request.region);
    const now = this.now();
    const settled = await Promise.allSettled(queries.map((query) => this.search(query, request, now)));
    const successful = settled.flatMap((outcome) => outcome.status === 'fulfilled' ? outcome.value : []);
    if (settled.every((outcome) => outcome.status === 'rejected')) {
      const first = settled[0];
      throw first.status === 'rejected' && first.reason instanceof Error
        ? first.reason
        : new Error('Threads keyword search failed');
    }
    const unique = new Map(successful.map((candidate) => [candidate.id, candidate]));
    return [...unique.values()]
      .filter((candidate) => candidate.status === 'live' && candidate.audienceFit >= 0.5)
      .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
      .slice(0, request.limit);
  }
}
