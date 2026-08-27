import type { TrendCandidate } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../../application/ports/trend-provider.ts';
import { scoreAudienceFit, scoreResearchability } from './trend-scoring.ts';

type Fetcher = typeof fetch;

interface GoogleNewsOptions {
  fetcher?: Fetcher;
  now?: () => Date;
}

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function field(item: string, name: string): string | undefined {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeXml(match[1]) : undefined;
}

export function parseGoogleNewsFeed(xml: string, now: Date): TrendCandidate[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return items.flatMap((item, index) => {
    const title = field(item, 'title');
    if (!title) return [];
    const published = new Date(field(item, 'pubDate') ?? now.toISOString());
    const observedAt = Number.isNaN(published.valueOf()) ? now.toISOString() : published.toISOString();
    const freshnessMinutes = Math.max(0, Math.round((now.valueOf() - new Date(observedAt).valueOf()) / 60_000));
    return [{
      id: `google-news:${index}:${title.toLowerCase()}`,
      title: title.replace(/\s+-\s+[^-]+$/, ''),
      source: 'google_news' as const,
      sourceLabel: 'Google News · live proxy',
      url: field(item, 'link'),
      observedAt,
      freshnessMinutes,
      growthSignal: 'Свежий сюжет в новостях',
      audienceFit: scoreAudienceFit(title),
      scientificResearchability: scoreResearchability(title),
      saturationRisk: freshnessMinutes > 2880 ? 0.65 : 0.3,
      platforms: ['News proxy'],
      status: freshnessMinutes <= 4320 ? 'live' as const : 'stale' as const,
    }];
  });
}

export class GoogleNewsFeed implements TrendProvider {
  readonly source = 'google_news' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;

  constructor(options: GoogleNewsOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async discover(request: TrendDiscoveryRequest): Promise<TrendCandidate[]> {
    const query = request.query?.trim() || 'фитнес OR тренировки OR мышцы OR белок OR похудение OR сон';
    const parameters = new URLSearchParams({ q: `${query} when:3d`, hl: 'ru', gl: request.region, ceid: `${request.region}:ru` });
    const response = await this.fetcher(`https://news.google.com/rss/search?${parameters}`, { signal: request.signal });
    if (!response.ok) throw new Error(`Google News RSS failed: ${response.status}`);
    return parseGoogleNewsFeed(await response.text(), this.now())
      .filter((candidate) => candidate.audienceFit >= 0.5 && candidate.scientificResearchability >= 0.5)
      .slice(0, request.limit);
  }
}
