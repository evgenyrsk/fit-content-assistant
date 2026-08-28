import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { TopicIdeaInput } from '@/lib/domain';
import { D1TopicBankStore } from '@/lib/infrastructure/d1/d1-topic-bank-store';
import { ensureKnowledgeSchema } from '@/lib/infrastructure/d1/ensure-knowledge-schema';
import { ensureOperationsSchema } from '@/lib/infrastructure/d1/ensure-operations-schema';
import { ensureTrendSchema } from '@/lib/infrastructure/d1/ensure-trend-schema';

const origins = new Set(['manual', 'knowledge_gap', 'contradiction', 'trend']);
const readiness = new Set(['supported', 'research_needed', 'blocked']);
const formats = new Set(['reels', 'telegram', 'threads', 'carousel']);
const statuses = new Set(['backlog', 'selected', 'dismissed']);

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function validText(body: Record<string, unknown>): boolean {
  return typeof body.title === 'string' && typeof body.angle === 'string';
}

function validClassification(body: Record<string, unknown>): boolean {
  return typeof body.origin === 'string' && origins.has(body.origin)
    && typeof body.scientificReadiness === 'string' && readiness.has(body.scientificReadiness);
}

function validWorkflow(body: Record<string, unknown>): boolean {
  const statusValid = body.status === undefined || (typeof body.status === 'string' && statuses.has(body.status));
  return typeof body.targetFormat === 'string' && formats.has(body.targetFormat) && statusValid;
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

function parseBody(value: unknown): TopicIdeaInput | null {
  const body = record(value);
  if (!body || !validText(body) || !validClassification(body) || !validWorkflow(body)) return null;
  return {
    id: typeof body.id === 'string' ? body.id : undefined, title: body.title as string, angle: body.angle as string,
    origin: body.origin as TopicIdeaInput['origin'], scientificReadiness: body.scientificReadiness as TopicIdeaInput['scientificReadiness'],
    targetFormat: body.targetFormat as TopicIdeaInput['targetFormat'], status: body.status as TopicIdeaInput['status'],
    linkedClaimIds: stringIds(body.linkedClaimIds), linkedSignalIds: stringIds(body.linkedSignalIds),
  };
}

async function ensureSchemas(database: D1Database): Promise<void> {
  await ensureKnowledgeSchema(database);
  await ensureTrendSchema(database);
  await ensureOperationsSchema(database);
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Банк тем недоступен.' }, { status: 503 });
  try { await ensureSchemas(database); return Response.json(await new D1TopicBankStore(database).list(new Date().toISOString())); }
  catch { return Response.json({ error: 'Не удалось загрузить банк тем.' }, { status: 503 }); }
}

export async function POST(request: Request): Promise<Response> {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return Response.json({ error: 'Некорректная тема.' }, { status: 400 });
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Банк тем недоступен.' }, { status: 503 });
  try {
    await ensureSchemas(database);
    return Response.json({ id: await new D1TopicBankStore(database).save(body, new Date().toISOString()), saved: true });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Тема не сохранена.' }, { status: 422 });
  }
}
