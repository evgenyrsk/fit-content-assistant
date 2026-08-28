import type { TrendCandidate } from '../../domain/index.ts';
import type { TrendDiscoveryRequest, TrendProvider } from '../../application/ports/trend-provider.ts';
import { scoreAudienceFit, scoreResearchability } from './trend-scoring.ts';

type Fetcher = typeof fetch;

interface InstagramOptions {
  accessToken: string;
  userId: string;
  apiVersion: string;
  fetcher?: Fetcher;
  now?: () => Date;
}

interface InstagramMedia {
  id?: string;
  caption?: string;
  comments_count?: number;
  like_count?: number;
  permalink?: string;
  timestamp?: string;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function hashtagFrom(query?: string): string {
  const firstTerm = (query?.trim() || 'фитнес').replace(/^#+/, '').split(/\s+/u)[0];
  return firstTerm.replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 100) || 'фитнес';
}

function engagementLabel(media: InstagramMedia): string {
  const likes = typeof media.like_count === 'number' ? media.like_count : 0;
  const comments = typeof media.comments_count === 'number' ? media.comments_count : 0;
  if (likes === 0 && comments === 0) return 'Свежая публикация по хештегу';
  return `Отклик · ${likes} реакций · ${comments} комментариев`;
}

function saturationRisk(media: InstagramMedia): number {
  const engagement = (media.like_count ?? 0) + (media.comments_count ?? 0) * 3;
  if (engagement >= 10_000) return 0.75;
  if (engagement >= 1_000) return 0.55;
  return 0.35;
}

function mediaCandidate(raw: unknown, now: Date, hashtag: string): TrendCandidate | undefined {
  const media = objectValue(raw) as InstagramMedia;
  const caption = media.caption?.replace(/\s+/g, ' ').trim();
  if (!media.id || !caption) return undefined;
  const timestamp = new Date(media.timestamp ?? now.toISOString());
  const observedAt = Number.isNaN(timestamp.valueOf()) ? now.toISOString() : timestamp.toISOString();
  const freshnessMinutes = Math.max(0, Math.round((now.valueOf() - new Date(observedAt).valueOf()) / 60_000));
  return {
    id: `instagram:${media.id}`,
    title: caption.slice(0, 180),
    source: 'instagram',
    sourceLabel: `Instagram · #${hashtag}`,
    url: media.permalink,
    observedAt,
    freshnessMinutes,
    growthSignal: engagementLabel(media),
    audienceFit: scoreAudienceFit(caption),
    scientificResearchability: scoreResearchability(caption),
    saturationRisk: saturationRisk(media),
    platforms: ['Instagram'],
    status: freshnessMinutes <= 2880 ? 'live' : 'stale',
  };
}

export function parseInstagramHashtagMedia(payload: unknown, now: Date, hashtag: string): TrendCandidate[] {
  const data = objectValue(payload).data;
  if (!Array.isArray(data)) return [];
  return data.map((raw) => mediaCandidate(raw, now, hashtag))
    .filter((candidate): candidate is TrendCandidate => candidate !== undefined);
}

export class InstagramHashtagSearch implements TrendProvider {
  readonly source = 'instagram' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;
  private readonly options: InstagramOptions;

  constructor(options: InstagramOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async discover(request: TrendDiscoveryRequest): Promise<TrendCandidate[]> {
    const hashtag = hashtagFrom(request.query);
    const common = { user_id: this.options.userId, access_token: this.options.accessToken };
    const lookup = new URLSearchParams({ ...common, q: hashtag });
    const graph = `https://graph.facebook.com/${this.options.apiVersion}`;
    const lookupResponse = await this.fetcher(`${graph}/ig_hashtag_search?${lookup}`, { signal: request.signal });
    if (!lookupResponse.ok) throw new Error(`Instagram hashtag lookup failed: ${lookupResponse.status}`);
    const hashtagId = objectValue((objectValue(await lookupResponse.json()).data as unknown[] | undefined)?.[0]).id;
    if (typeof hashtagId !== 'string') return [];

    const media = new URLSearchParams({
      ...common,
      fields: 'id,caption,comments_count,like_count,permalink,timestamp',
      limit: String(request.limit),
    });
    const mediaResponse = await this.fetcher(`${graph}/${hashtagId}/recent_media?${media}`, { signal: request.signal });
    if (!mediaResponse.ok) throw new Error(`Instagram hashtag media failed: ${mediaResponse.status}`);
    return parseInstagramHashtagMedia(await mediaResponse.json(), this.now(), hashtag)
      .filter((candidate) => candidate.audienceFit >= 0.5)
      .slice(0, request.limit);
  }
}
