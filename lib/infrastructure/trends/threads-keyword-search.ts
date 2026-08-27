import type { TrendCandidate } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../../application/ports/trend-provider.ts';
import { scoreAudienceFit, scoreResearchability } from './trend-scoring.ts';

type Fetcher = typeof fetch;

interface ThreadsOptions {
  accessToken: string;
  apiVersion: string;
  fetcher?: Fetcher;
  now?: () => Date;
}

interface ThreadsPost {
  id?: string;
  text?: string;
  timestamp?: string;
  permalink?: string;
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
      growthSignal: 'Верхний результат поиска Threads',
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

  constructor(options: ThreadsOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async discover(request: TrendDiscoveryRequest): Promise<TrendCandidate[]> {
    const query = request.query?.trim() || 'фитнес тренировки питание';
    const parameters = new URLSearchParams({
      q: query,
      search_type: 'TOP',
      fields: 'id,text,timestamp,permalink',
      limit: String(request.limit),
      access_token: this.options.accessToken,
    });
    const base = `https://graph.threads.net/${this.options.apiVersion}/keyword_search`;
    const response = await this.fetcher(`${base}?${parameters}`, { signal: request.signal });
    if (!response.ok) throw new Error(`Threads keyword search failed: ${response.status}`);
    return parseThreadsPosts(await response.json(), this.now())
      .filter((candidate) => candidate.audienceFit >= 0.5)
      .slice(0, request.limit);
  }
}
