import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { ContentFragment, ManualContentInput } from '@/lib/domain';
import { D1ContentOperationsStore } from '@/lib/infrastructure/d1/d1-content-operations-store';
import { ensureContentSchema } from '@/lib/infrastructure/d1/ensure-content-schema';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureOperationsSchema } from '@/lib/infrastructure/d1/ensure-operations-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

const formats = new Set(['reels', 'telegram', 'threads', 'carousel']);
const fragmentKinds = new Set<ContentFragment['kind']>(['fact', 'opinion', 'illustration', 'transition', 'cta']);

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function validCore(body: Record<string, unknown>): boolean {
  return typeof body.title === 'string' && typeof body.text === 'string';
}

function validClassification(body: Record<string, unknown>): boolean {
  return typeof body.format === 'string' && formats.has(body.format)
    && typeof body.fragmentKind === 'string' && fragmentKinds.has(body.fragmentKind as ContentFragment['kind']);
}

function parseBody(value: unknown): ManualContentInput | null {
  const body = record(value);
  if (!body || !validCore(body) || !validClassification(body) || !stringArray(body.claimVersionIds)) return null;
  return {
    itemId: typeof body.itemId === 'string' ? body.itemId : undefined,
    title: body.title as string, text: body.text as string, format: body.format as ManualContentInput['format'],
    fragmentKind: body.fragmentKind as ContentFragment['kind'], claimVersionIds: body.claimVersionIds,
    changeNote: typeof body.changeNote === 'string' ? body.changeNote : '',
  };
}

async function ensureSchemas(database: D1Database): Promise<void> {
  await ensureResearchSchema(database);
  await ensureEvidenceSchema(database);
  await ensureKnowledgeSchema(database);
  await ensureContentSchema(database);
  await ensureOperationsSchema(database);
}

export async function POST(request: Request): Promise<Response> {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return Response.json({ error: 'Некорректные параметры ручного материала.' }, { status: 400 });
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Хранилище контента недоступно.' }, { status: 503 });
  try {
    await ensureSchemas(database);
    const result = await new D1ContentOperationsStore(database).saveManual(body, new Date().toISOString());
    return Response.json({ ...result, status: 'needs_review', editorialStatus: 'draft' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Не удалось сохранить материал.';
    return Response.json({ error: message }, { status: message.includes('не найден') ? 404 : 422 });
  }
}
