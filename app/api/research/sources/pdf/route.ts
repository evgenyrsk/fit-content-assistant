import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { ensureEvidenceSchema } from '@/lib/infrastructure/d1/ensure-evidence-schema';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

interface RuntimeBindings {
  DB?: D1Database | string;
  SOURCE_FILES?: R2Bucket | string;
}

interface FileRow {
  object_key: string;
  original_filename: string;
}

function bindings(): { database: D1Database; bucket: R2Bucket } | null {
  const runtime = env as unknown as RuntimeBindings;
  if (!runtime.DB || typeof runtime.DB === 'string') return null;
  if (!runtime.SOURCE_FILES || typeof runtime.SOURCE_FILES === 'string') return null;
  return { database: runtime.DB, bucket: runtime.SOURCE_FILES };
}

export async function GET(request: Request): Promise<Response> {
  const runtime = bindings();
  if (!runtime) return new Response('Хранилище PDF недоступно.', { status: 503 });
  const sourceId = new URL(request.url).searchParams.get('sourceId');
  if (!sourceId?.startsWith('upload:')) return new Response('PDF не найден.', { status: 404 });
  await ensureResearchSchema(runtime.database);
  await ensureEvidenceSchema(runtime.database);
  const file = await runtime.database.prepare(`
    SELECT object_key, original_filename FROM manual_source_imports WHERE source_id = ?
  `).bind(sourceId).first<FileRow>();
  if (!file) return new Response('PDF не найден.', { status: 404 });
  const object = await runtime.bucket.get(file.object_key);
  if (!object || !('body' in object)) return new Response('PDF не найден.', { status: 404 });
  const encodedName = encodeURIComponent(file.original_filename).replace(
    /['()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return new Response(await object.arrayBuffer(), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'private, no-store',
      ETag: object.httpEtag,
    },
  });
}
