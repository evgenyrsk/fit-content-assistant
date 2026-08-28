import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { parsePublicationMetricsCsv, type PublicationMetricInput } from '@/lib/domain';
import { D1PerformanceStore } from '@/lib/infrastructure/d1/d1-performance-store';
import { ensureContentSchema } from '@/lib/infrastructure/d1/ensure-content-schema';
import { ensureOperationsSchema } from '@/lib/infrastructure/d1/ensure-operations-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function number(value: unknown): number { return typeof value === 'number' ? value : Number.NaN; }

function parseMetric(value: unknown): PublicationMetricInput | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.contentItemId !== 'string' || typeof body.platform !== 'string'
    || typeof body.recordedAt !== 'string') return null;
  return {
    contentItemId: body.contentItemId, platform: body.platform, recordedAt: body.recordedAt,
    views: number(body.views), likes: number(body.likes), comments: number(body.comments),
    saves: number(body.saves), shares: number(body.shares),
    watchTimeSeconds: body.watchTimeSeconds === undefined ? undefined : number(body.watchTimeSeconds), source: 'manual',
  };
}

async function ensureSchemas(database: D1Database): Promise<void> {
  await ensureContentSchema(database);
  await ensureOperationsSchema(database);
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Аналитика недоступна.' }, { status: 503 });
  try { await ensureSchemas(database); return Response.json(await new D1PerformanceStore(database).list(new Date().toISOString())); }
  catch { return Response.json({ error: 'Не удалось загрузить метрики.' }, { status: 503 }); }
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.json().catch(() => null) as { csv?: unknown; metric?: unknown } | null;
  let metrics: PublicationMetricInput[];
  try {
    if (typeof raw?.csv === 'string') metrics = parsePublicationMetricsCsv(raw.csv);
    else {
      const metric = parseMetric(raw?.metric);
      if (!metric) return Response.json({ error: 'Некорректные метрики.' }, { status: 400 });
      metrics = [metric];
    }
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'CSV не прочитан.' }, { status: 422 });
  }
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Аналитика недоступна.' }, { status: 503 });
  try {
    await ensureSchemas(database);
    return Response.json({ imported: await new D1PerformanceStore(database).saveAll(metrics, new Date().toISOString()) });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Метрики не сохранены.' }, { status: 422 });
  }
}
