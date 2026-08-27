import type { EvidenceRecordStatus, ScientificSourceDocument, SourceDocumentChunk } from '../../domain/index.ts';
import type { ScientificSourceDocumentLoader } from '../../application/ports/scientific-source-document-loader.ts';

type Fetcher = typeof fetch;

interface PubmedDocumentLoaderOptions {
  apiKey?: string;
  email?: string;
  fetcher?: Fetcher;
  now?: () => Date;
}

function decodeXml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/giu, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'").replace(/\s+/g, ' ').trim();
}

function firstElement(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function elementValues(xml: string, tag: string): string[] {
  const expression = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  return [...xml.matchAll(expression)].map((match) => decodeXml(match[1])).filter(Boolean);
}

function articleId(article: string, type: string): string | undefined {
  const expression = new RegExp(`<ArticleId\\s+IdType=["']${type}["'][^>]*>([\\s\\S]*?)<\\/ArticleId>`, 'i');
  const value = article.match(expression)?.[1];
  return value ? decodeXml(value) : undefined;
}

function recordStatus(article: string, publicationTypes: string[]): EvidenceRecordStatus {
  const normalized = publicationTypes.join(' ').toLowerCase();
  if (normalized.includes('retracted publication') || /RefType=["']RetractionOf["']/i.test(article)) return 'retracted';
  if (normalized.includes('expression of concern') || /RefType=["']ExpressionOfConcernFor["']/i.test(article)) return 'expression_of_concern';
  if (/RefType=["'](?:UpdateOf|ErratumFor)["']/i.test(article)) return 'corrected';
  return 'active';
}

function abstractChunks(article: string, sourceId: string): SourceDocumentChunk[] {
  const expression = /<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/gi;
  return [...article.matchAll(expression)].flatMap((match, index) => {
    const text = decodeXml(match[2]);
    if (!text) return [];
    const label = match[1].match(/Label=["']([^"']+)["']/i)?.[1];
    return [{
      id: `${sourceId}:abstract:${index + 1}`, sourceId, kind: 'abstract',
      locator: label ? `abstract:${decodeXml(label).toLowerCase()}` : `abstract:${index + 1}`,
      text,
    }];
  });
}

function parseArticle(article: string, fetchedAt: string): ScientificSourceDocument | null {
  const pmid = firstElement(article, 'PMID');
  const title = firstElement(article, 'ArticleTitle');
  if (!pmid || !title) return null;
  const sourceId = `pmid:${pmid}`;
  const chunks = abstractChunks(article, sourceId);
  const publicationTypes = elementValues(article, 'PublicationType');
  return {
    sourceId, provider: 'pubmed', externalId: pmid, title,
    doi: articleId(article, 'doi'), pmid, pmcid: articleId(article, 'pmc'), publicationTypes,
    recordStatus: recordStatus(article, publicationTypes),
    contentLevel: chunks.length > 0 ? 'abstract_only' : 'metadata_only',
    chunks, fetchedAt,
  };
}

export function parsePubmedDocuments(xml: string, fetchedAt: string): ScientificSourceDocument[] {
  return [...xml.matchAll(/<PubmedArticle\b[\s\S]*?<\/PubmedArticle>/gi)]
    .flatMap((match) => parseArticle(match[0], fetchedAt) ?? []);
}

export class PubmedDocumentLoader implements ScientificSourceDocumentLoader {
  readonly provider = 'pubmed' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;
  private readonly options: PubmedDocumentLoaderOptions;

  constructor(options: PubmedDocumentLoaderOptions = {}) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async load(externalIds: string[]): Promise<ScientificSourceDocument[]> {
    const ids = externalIds.filter((id) => /^\d+$/.test(id)).slice(0, 10);
    if (ids.length === 0) return [];
    const parameters = new URLSearchParams({
      db: 'pubmed', id: ids.join(','), retmode: 'xml', rettype: 'abstract', tool: 'forme_content_os',
    });
    if (this.options.email) parameters.set('email', this.options.email);
    if (this.options.apiKey) parameters.set('api_key', this.options.apiKey);
    const response = await this.fetcher(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${parameters}`);
    if (!response.ok) throw new Error(`PubMed document fetch failed: ${response.status}`);
    return parsePubmedDocuments(await response.text(), this.now().toISOString());
  }
}
