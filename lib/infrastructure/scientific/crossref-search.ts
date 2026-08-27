import type { ScientificSourceCandidate } from '../../domain/index.ts';
import type { ScientificSearchRequest, ScientificSourceSearch } from '../../application/ports/scientific-source-search.ts';

type Fetcher = typeof fetch;

interface CrossrefSearchOptions {
  mailto?: string;
  fetcher?: Fetcher;
  now?: () => Date;
}

interface CrossrefWork {
  DOI?: string;
  URL?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  'container-title'?: string[];
  type?: string;
  published?: { 'date-parts'?: number[][] };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function publishedDate(work: CrossrefWork): string | undefined {
  const parts = work.published?.['date-parts']?.[0];
  if (!parts?.[0]) return undefined;
  return [parts[0], String(parts[1] ?? 1).padStart(2, '0'), String(parts[2] ?? 1).padStart(2, '0')].join('-');
}

function workAuthors(work: CrossrefWork): string[] {
  if (!work.author) return [];
  return work.author.map((author) => [author.given, author.family].filter(Boolean).join(' ')).filter(Boolean);
}

function workUrl(work: CrossrefWork, doi?: string): string {
  if (work.URL) return work.URL;
  return doi ? `https://doi.org/${doi}` : 'https://search.crossref.org/';
}

export function parseCrossrefWorks(payload: unknown, discoveredAt: string): ScientificSourceCandidate[] {
  const items = objectValue(objectValue(payload).message).items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw, index) => mapCrossrefWork(raw, index, discoveredAt));
}

function mapCrossrefWork(raw: unknown, index: number, discoveredAt: string): ScientificSourceCandidate[] {
  const work = objectValue(raw) as CrossrefWork;
  const title = work.title?.[0];
  if (!title) return [];
  const doi = work.DOI?.toLowerCase();
  return [{
    id: `crossref:${doi ?? index}`,
    provider: 'crossref',
    title,
    authors: workAuthors(work),
    journal: work['container-title']?.[0],
    publishedAt: publishedDate(work),
    doi,
    url: workUrl(work, doi),
    sourceType: work.type ?? 'journal-article',
    discoveredAt,
  }];
}

export class CrossrefSearch implements ScientificSourceSearch {
  readonly provider = 'crossref' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;
  private readonly options: CrossrefSearchOptions;

  constructor(options: CrossrefSearchOptions = {}) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async search(request: ScientificSearchRequest): Promise<ScientificSourceCandidate[]> {
    const parameters = new URLSearchParams({
      'query.bibliographic': request.query,
      rows: String(request.limit),
      select: 'DOI,title,author,container-title,published,type,URL',
    });
    if (this.options.mailto) parameters.set('mailto', this.options.mailto);
    const response = await this.fetcher(`https://api.crossref.org/v1/works?${parameters}`, {
      headers: { 'User-Agent': 'FormeContentOS/0.1 (scientific metadata retrieval)' },
      signal: request.signal,
    });
    if (!response.ok) throw new Error(`Crossref search failed: ${response.status}`);
    return parseCrossrefWorks(await response.json(), this.now().toISOString());
  }
}
