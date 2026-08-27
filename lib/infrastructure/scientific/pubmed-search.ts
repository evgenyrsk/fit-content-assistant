import type { ScientificSourceCandidate } from '../../domain/index.ts';
import type { ScientificSearchRequest, ScientificSourceSearch } from '../../application/ports/scientific-source-search.ts';

type Fetcher = typeof fetch;

interface PubmedSearchOptions {
  apiKey?: string;
  email?: string;
  fetcher?: Fetcher;
  now?: () => Date;
}

interface PubmedSummary {
  uid?: string;
  title?: string;
  pubdate?: string;
  fulljournalname?: string;
  pubtype?: string[];
  authors?: Array<{ name?: string }>;
  articleids?: Array<{ idtype?: string; value?: string }>;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function parsePubmedSummaries(payload: unknown, discoveredAt: string): ScientificSourceCandidate[] {
  const result = objectValue(objectValue(payload).result);
  const uids = Array.isArray(result.uids) ? result.uids.filter((id): id is string => typeof id === 'string') : [];
  return uids.flatMap((pmid) => {
    const item = objectValue(result[pmid]) as PubmedSummary;
    if (!item.title) return [];
    const doi = item.articleids?.find((identifier) => identifier.idtype === 'doi')?.value;
    return [{
      id: `pubmed:${pmid}`,
      provider: 'pubmed' as const,
      title: item.title,
      authors: item.authors?.flatMap((author) => author.name ? [author.name] : []) ?? [],
      journal: item.fulljournalname,
      publishedAt: item.pubdate,
      doi,
      pmid,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      sourceType: item.pubtype?.join(', ') || 'journal article',
      discoveredAt,
    }];
  });
}

export class PubmedSearch implements ScientificSourceSearch {
  readonly provider = 'pubmed' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;
  private readonly options: PubmedSearchOptions;

  constructor(options: PubmedSearchOptions = {}) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  private commonParameters(): URLSearchParams {
    const parameters = new URLSearchParams({ tool: 'forme_content_os', retmode: 'json' });
    if (this.options.email) parameters.set('email', this.options.email);
    if (this.options.apiKey) parameters.set('api_key', this.options.apiKey);
    return parameters;
  }

  async search(request: ScientificSearchRequest): Promise<ScientificSourceCandidate[]> {
    const searchParameters = this.commonParameters();
    searchParameters.set('db', 'pubmed');
    searchParameters.set('term', request.query);
    searchParameters.set('retmax', String(request.limit));
    searchParameters.set('sort', 'relevance');
    const searchResponse = await this.fetcher(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParameters}`, { signal: request.signal });
    if (!searchResponse.ok) throw new Error(`PubMed search failed: ${searchResponse.status}`);
    const searchPayload = objectValue(await searchResponse.json());
    const ids = objectValue(searchPayload.esearchresult).idlist;
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const summaryParameters = this.commonParameters();
    summaryParameters.set('db', 'pubmed');
    summaryParameters.set('version', '2.0');
    summaryParameters.set('id', ids.filter((id): id is string => typeof id === 'string').join(','));
    const summaryResponse = await this.fetcher(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParameters}`, { signal: request.signal });
    if (!summaryResponse.ok) throw new Error(`PubMed summary failed: ${summaryResponse.status}`);
    return parsePubmedSummaries(await summaryResponse.json(), this.now().toISOString());
  }
}
