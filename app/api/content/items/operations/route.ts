import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { ContentOperationInput, EditorialStatus } from '@/lib/domain';
import { D1ContentOperationsStore } from '@/lib/infrastructure/d1/d1-content-operations-store';
import { ensureContentSchema } from '@/lib/infrastructure/d1/ensure-content-schema';
import { ensureOperationsSchema } from '@/lib/infrastructure/d1/ensure-operations-schema';

const statuses = new Set<EditorialStatus>(['draft', 'fact_check', 'ready', 'scheduled', 'published', 'archived']);

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function parseBody(value: unknown): ContentOperationInput | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.contentItemId !== 'string' || typeof body.editorialStatus !== 'string'
    || !statuses.has(body.editorialStatus as EditorialStatus)) return null;
  return {
    contentItemId: body.contentItemId, editorialStatus: body.editorialStatus as EditorialStatus,
    scheduledFor: typeof body.scheduledFor === 'string' ? body.scheduledFor : undefined,
    publicationUrl: typeof body.publicationUrl === 'string' ? body.publicationUrl : undefined,
  };
}

export async function POST(request: Request): Promise<Response> {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return Response.json({ error: 'Некорректное изменение статуса.' }, { status: 400 });
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Хранилище контента недоступно.' }, { status: 503 });
  try {
    await ensureContentSchema(database);
    await ensureOperationsSchema(database);
    await new D1ContentOperationsStore(database).updateOperation(body, new Date().toISOString());
    return Response.json({ saved: true, editorialStatus: body.editorialStatus });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Статус не изменён.' }, { status: 422 });
  }
}
