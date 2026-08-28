import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import type { UserNote } from '@/lib/domain';
import { D1TopicBankStore } from '@/lib/infrastructure/d1/d1-topic-bank-store';
import { ensureOperationsSchema } from '@/lib/infrastructure/d1/ensure-operations-schema';

const kinds = new Set<UserNote['kind']>(['personal_experience', 'observation', 'idea']);

function databaseBinding(): D1Database | null {
  const runtime = env as unknown as Record<string, string | D1Database | undefined>;
  return runtime.DB && typeof runtime.DB !== 'string' ? runtime.DB : null;
}

function parseBody(value: unknown): Omit<UserNote, 'id' | 'evidenceUse' | 'createdAt'> | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (typeof body.kind !== 'string' || !kinds.has(body.kind as UserNote['kind'])
    || typeof body.topic !== 'string' || typeof body.content !== 'string') return null;
  return { kind: body.kind as UserNote['kind'], topic: body.topic, content: body.content };
}

export async function GET(): Promise<Response> {
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Личные заметки недоступны.' }, { status: 503 });
  try { await ensureOperationsSchema(database); return Response.json({ notes: await new D1TopicBankStore(database).listNotes(50) }); }
  catch { return Response.json({ error: 'Не удалось загрузить заметки.' }, { status: 503 }); }
}

export async function POST(request: Request): Promise<Response> {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return Response.json({ error: 'Некорректная заметка.' }, { status: 400 });
  const database = databaseBinding();
  if (!database) return Response.json({ error: 'Личные заметки недоступны.' }, { status: 503 });
  try {
    await ensureOperationsSchema(database);
    return Response.json({ id: await new D1TopicBankStore(database).saveNote(body, new Date().toISOString()), saved: true });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Заметка не сохранена.' }, { status: 422 });
  }
}
