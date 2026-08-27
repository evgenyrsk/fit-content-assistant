import { env } from 'cloudflare:workers';
import type { D1Database } from '@cloudflare/workers-types';
import type { TrendSource } from '@/lib/domain';
import { discoverTrends } from '@/lib/application/use-cases/discover-trends';
import type { TrendProvider } from '@/lib/application/ports/trend-provider';
import { GoogleTrendsRss } from '@/lib/infrastructure/trends/google-trends-rss';
import { GoogleNewsFeed } from '@/lib/infrastructure/trends/google-news-feed';
import { ThreadsKeywordSearch } from '@/lib/infrastructure/trends/threads-keyword-search';
import { D1TrendSignalStore } from '@/lib/infrastructure/d1/d1-trend-signal-store';
import { ensureTrendSchema } from '@/lib/infrastructure/d1/ensure-trend-schema';

function runtime(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

function requestedSources(value: string | null): TrendSource[] {
  if (value === 'threads') return ['threads'];
  if (value === 'instagram') return ['instagram'];
  if (value === 'google_trends') return ['google_trends'];
  if (value === 'google_news') return ['google_news'];
  return ['google_trends', 'google_news', 'threads', 'instagram'];
}

function configuredProviders(expected: TrendSource[], settings: Record<string, string | D1Database | undefined>): TrendProvider[] {
  const providers: TrendProvider[] = [];
  if (expected.includes('google_trends')) providers.push(new GoogleTrendsRss());
  if (expected.includes('google_news')) providers.push(new GoogleNewsFeed());
  const token = settings.THREADS_ACCESS_TOKEN;
  const version = settings.THREADS_API_VERSION;
  if (expected.includes('threads') && typeof token === 'string' && typeof version === 'string') {
    providers.push(new ThreadsKeywordSearch({ accessToken: token, apiVersion: version }));
  }
  return providers;
}

function configuredDatabase(settings: Record<string, string | D1Database | undefined>): D1Database | undefined {
  return settings.DB && typeof settings.DB !== 'string' ? settings.DB : undefined;
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
  }, { providers, expectedSources, store: database ? new D1TrendSignalStore(database) : undefined });
  return Response.json(result, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
