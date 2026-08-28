import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { ContentReviewInput } from '@/lib/domain';
import { D1ContentOperationsStore } from '@/lib/infrastructure/d1/d1-content-operations-store';
import { ensureContentSchema } from '@/lib/infrastructure/d1/ensure-content-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureOperationsSchema } from '@/lib/infrastructure/d1/ensure-operations-schema';

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function parseBody(value: unknown): ContentReviewInput | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.contentItemId !== 'string' || !['approved', 'rejected'].includes(String(body.decision))
    || typeof body.traceChecked !== 'boolean' || typeof body.caveatsChecked !== 'boolean'
    || typeof body.platformFitChecked !== 'boolean' || typeof body.notes !== 'string') return null;
  return body as unknown as ContentReviewInput;
}

export async function POST(request: Request): Promise<Response> {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return Response.json({ error: 'Некорректные параметры факт-чека.' }, { status: 400 });
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Хранилище контента недоступно.' }, { status: 503 });
  try {
    await ensureKnowledgeSchema(database);
    await ensureContentSchema(database);
    await ensureOperationsSchema(database);
    await new D1ContentOperationsStore(database).review(body, new Date().toISOString());
    return Response.json({ saved: true, status: body.decision === 'approved' ? 'ready' : 'draft' });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Факт-чек не сохранён.' }, { status: 422 });
  }
}
