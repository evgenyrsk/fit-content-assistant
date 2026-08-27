import type { D1Database } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';
import { buildScientificQuery } from '@/lib/application/use-cases/build-scientific-query';
import { searchScientificSources } from '@/lib/application/use-cases/search-scientific-sources';
import { CrossrefSearch } from '@/lib/infrastructure/scientific/crossref-search';
import { PubmedSearch } from '@/lib/infrastructure/scientific/pubmed-search';
import { D1ResearchRunStore } from '@/lib/infrastructure/d1/d1-research-run-store';
import { ensureResearchSchema } from '@/lib/infrastructure/d1/ensure-research-schema';

interface ResearchRequestBody {
  query?: unknown;
}

function bindings(): Record<string, string | D1Database | undefined> {
  return env as unknown as Record<string, string | D1Database | undefined>;
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({})) as ResearchRequestBody;
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (query.length < 3 || query.length > 500) {
    return Response.json({ error: 'Введите вопрос длиной от 3 до 500 символов.' }, { status: 400 });
  }
  const runtime = bindings();
  if (!runtime.DB || typeof runtime.DB === 'string') {
    return Response.json({ error: 'Хранилище исследований пока недоступно.' }, { status: 503 });
  }
  const searches = [
    new PubmedSearch({ apiKey: runtime.PUBMED_API_KEY as string, email: runtime.NCBI_EMAIL as string }),
    new CrossrefSearch({ mailto: runtime.CROSSREF_MAILTO as string }),
  ];
  try {
    await ensureResearchSchema(runtime.DB);
    const result = await searchScientificSources(query, 10, {
      searches,
      store: new D1ResearchRunStore(runtime.DB),
      retrievalQuery: buildScientificQuery(query),
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Не удалось сохранить исследовательский запуск. Попробуйте ещё раз.' }, { status: 503 });
  }
}
