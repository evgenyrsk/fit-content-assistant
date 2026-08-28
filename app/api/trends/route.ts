import { env } from 'cloudflare:workers';
import type { D1Database } from '@cloudflare/workers-types';
import type { TrendSource } from '@/lib/domain';
import { discoverTrends } from '@/lib/application/use-cases/discover-trends';
import type { TrendProvider } from '@/lib/application/ports/trend-provider';
import { GoogleTrendsRss } from '@/lib/infrastructure/trends/google-trends-rss';
import { GoogleNewsFeed } from '@/lib/infrastructure/trends/google-news-feed';
import { ThreadsKeywordSearch } from '@/lib/infrastructure/trends/threads-keyword-search';
import { InstagramHashtagSearch } from '@/lib/infrastructure/trends/instagram-hashtag-search';
import { D1TrendSignalStore } from '@/lib/infrastructure/d1/d1-trend-signal-store';
import { ensureTrendSchema } from '@/lib/infrastructure/d1/ensure-trend-schema';
import { PubmedResearchPulse } from '@/lib/infrastructure/trends/pubmed-research-pulse';

function runtime(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

function requestedSources(value: string | null): TrendSource[] {
  if (value === 'threads') return ['threads'];
  if (value === 'instagram') return ['instagram'];
  if (value === 'google_trends') return ['google_trends'];
  if (value === 'google_news') return ['google_news'];
  if (value === 'pubmed_pulse') return ['pubmed_pulse'];
  return ['google_trends', 'google_news', 'pubmed_pulse', 'threads', 'instagram'];
}

function threadsProvider(settings: Record<string, string | D1Database | undefined>): TrendProvider | undefined {
  const token = settings.THREADS_ACCESS_TOKEN;
  const version = settings.THREADS_API_VERSION;
  if (typeof token !== 'string' || typeof version !== 'string') return undefined;
  return new ThreadsKeywordSearch({ accessToken: token, apiVersion: version });
}

function instagramProvider(settings: Record<string, string | D1Database | undefined>): TrendProvider | undefined {
  const token = settings.INSTAGRAM_ACCESS_TOKEN;
  const userId = settings.INSTAGRAM_USER_ID;
  const version = settings.META_GRAPH_API_VERSION;
  if (typeof token !== 'string' || typeof userId !== 'string' || typeof version !== 'string') return undefined;
  return new InstagramHashtagSearch({ accessToken: token, userId, apiVersion: version });
}

function addOptionalProvider(
  providers: TrendProvider[], expected: TrendSource[], source: TrendSource, provider?: TrendProvider,
): void {
  if (expected.includes(source) && provider) providers.push(provider);
}

function configuredProviders(expected: TrendSource[], settings: Record<string, string | D1Database | undefined>): TrendProvider[] {
  const providers: TrendProvider[] = [];
  if (expected.includes('google_trends')) providers.push(new GoogleTrendsRss());
  if (expected.includes('google_news')) providers.push(new GoogleNewsFeed());
  if (expected.includes('pubmed_pulse')) {
    providers.push(new PubmedResearchPulse({
      apiKey: typeof settings.PUBMED_API_KEY === 'string' ? settings.PUBMED_API_KEY : undefined,
      email: typeof settings.NCBI_EMAIL === 'string' ? settings.NCBI_EMAIL : undefined,
    }));
  }
  addOptionalProvider(providers, expected, 'threads', threadsProvider(settings));
  addOptionalProvider(providers, expected, 'instagram', instagramProvider(settings));
  return providers;
}

function configuredDatabase(settings: Record<string, string | D1Database | undefined>): D1Database | undefined {
  return settings.DB && typeof settings.DB !== 'string' ? settings.DB : undefined;
}

function sourceNotices(
  expected: TrendSource[], settings: Record<string, string | D1Database | undefined>,
): Partial<Record<TrendSource, string>> {
  if (!expected.includes('threads') || typeof settings.THREADS_ACCESS_TOKEN !== 'string') return {};
  if (settings.THREADS_APP_MODE === 'live') return {};
  return {
    threads: 'Threads подключён в личном режиме Meta Development. Для аккаунта с ролью в приложении публичный App Review не требуется.',
  };
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const expectedSources = requestedSources(url.searchParams.get('source'));
  const settings = runtime();
  const providers = configuredProviders(expectedSources, settings);
  const database = configuredDatabase(settings);
  if (database) await ensureTrendSchema(database);
  const result = await discoverTrends({
    query: url.searchParams.get('q') ?? undefined,
    region: typeof settings.TREND_REGION === 'string' ? settings.TREND_REGION : 'RU',
    limit: 6,
  }, {
    providers,
    expectedSources,
    sourceNotices: sourceNotices(expectedSources, settings),
    store: database ? new D1TrendSignalStore(database) : undefined,
  });
  return Response.json(result, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
