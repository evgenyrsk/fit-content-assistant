import type { TrendCandidate } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../../application/ports/trend-provider.ts';
import { scoreAudienceFit, scoreResearchability } from './trend-scoring.ts';

type Fetcher = typeof fetch;

interface GoogleTrendsOptions {
  fetcher?: Fetcher;
  now?: () => Date;
}

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function field(item: string, name: string): string | undefined {
  const escaped = name.replace(':', '\\:');
  const match = item.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? decodeXml(match[1]) : undefined;
}

function trafficLabel(value?: string): string {
  return value ? `Всплеск поиска · ${value}` : 'Всплеск поиска Google';
}

export function parseGoogleTrendsRss(xml: string, now: Date): TrendCandidate[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return items.flatMap((item, index) => {
    const title = field(item, 'title');
    if (!title) return [];
    const published = new Date(field(item, 'pubDate') ?? now.toISOString());
    const observedAt = Number.isNaN(published.valueOf()) ? now.toISOString() : published.toISOString();
    const freshnessMinutes = Math.max(0, Math.round((now.valueOf() - new Date(observedAt).valueOf()) / 60_000));
    const audienceFit = scoreAudienceFit(title);
    return [{
      id: `google-trends:${index}:${title.toLowerCase()}`,
      title,
      source: 'google_trends' as const,
      sourceLabel: 'Google Trends · live proxy',
      url: field(item, 'link'),
      observedAt,
      freshnessMinutes,
      growthSignal: trafficLabel(field(item, 'ht:approx_traffic')),
      audienceFit,
      scientificResearchability: scoreResearchability(title),
      saturationRisk: freshnessMinutes > 720 ? 0.65 : 0.35,
      platforms: ['Search'],
      status: freshnessMinutes <= 1440 ? 'live' as const : 'stale' as const,
    }];
  });
}

export class GoogleTrendsRss implements TrendProvider {
  readonly source = 'google_trends' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;

  constructor(options: GoogleTrendsOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async discover(request: TrendDiscoveryRequest): Promise<TrendCandidate[]> {
    const response = await this.fetcher(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(request.region)}`, { signal: request.signal });
    if (!response.ok) throw new Error(`Google Trends RSS failed: ${response.status}`);
    const candidates = parseGoogleTrendsRss(await response.text(), this.now());
    const query = request.query?.trim().toLowerCase();
    return candidates
      .filter((candidate) => query ? candidate.title.toLowerCase().includes(query) : candidate.audienceFit >= 0.5)
      .slice(0, request.limit);
  }
}
