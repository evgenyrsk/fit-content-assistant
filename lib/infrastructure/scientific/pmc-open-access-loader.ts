import type { ScientificSourceDocument, SourceChunkKind, SourceDocumentChunk } from '../../domain/index.ts';
import type { ScientificSourceDocumentLoader } from '../../application/ports/scientific-source-document-loader.ts';

type Fetcher = typeof fetch;
type JsonRecord = Record<string, unknown>;

interface PmcLoaderOptions {
  fetcher?: Fetcher;
  now?: () => Date;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function permitsFormeReuse(license: string): boolean {
  const normalized = license.toLowerCase().replace(/[_\s]+/g, ' ').trim();
  if (normalized.includes('noncommercial') || normalized.includes('no derivatives')) return false;
  if (/\bcc\s*by-(?:nc|nd)\b/.test(normalized)) return false;
  return normalized === 'cc0' || normalized.includes('public domain')
    || /^cc\s*by(?:-sa)?(?:\s|$)/.test(normalized)
    || normalized.includes('creative commons attribution license');
}

function sectionKind(section: string): SourceChunkKind | null {
  if (section === 'ABSTRACT') return 'abstract';
  if (section.includes('METHOD') || section.includes('MATERIAL')) return 'methods';
  if (section.includes('RESULT')) return 'results';
  if (section.includes('DISCUSS') || section.includes('CONCL')) return 'discussion';
  if (section === 'INTRO') return 'other';
  return null;
}

function passageChunks(passages: unknown[], sourceId: string, pmcid: string): SourceDocumentChunk[] {
  return passages.flatMap((value, index) => {
    const passage = record(value);
    const infons = record(passage.infons);
    const section = text(infons.section_type).toUpperCase();
    const kind = sectionKind(section);
    const content = text(passage.text).replace(/\s+/g, ' ');
    if (!kind || content.length < 30 || text(infons.type).startsWith('title')) return [];
    const offset = typeof passage.offset === 'number' ? passage.offset : index;
    return [{
      id: `${sourceId}:pmc:${offset}`, sourceId, kind,
      locator: `${pmcid}:${section.toLowerCase()}:offset-${offset}`, text: content,
    }];
  });
}

function passageInfons(passages: unknown[]): JsonRecord {
  return passages.map((passage) => record(record(passage).infons))
    .find((infons) => text(infons['article-id_pmid'])) ?? {};
}

function documentIdentity(document: JsonRecord, passages: unknown[]) {
  const identifiers = passageInfons(passages);
  return {
    identifiers,
    pmid: text(identifiers['article-id_pmid']),
    pmcid: (text(identifiers['article-id_pmc']) || text(document.id)).toUpperCase(),
    license: text(record(document.infons).license) || text(identifiers.license),
  };
}

function documentTitle(passages: unknown[]): string | undefined {
  return passages.map((passage) => {
    const item = record(passage);
    return text(record(item.infons).section_type).toUpperCase() === 'TITLE' ? text(item.text) : '';
  }).find(Boolean);
}

function hasAssessmentSections(chunks: SourceDocumentChunk[]): boolean {
  const kinds = new Set(chunks.map((chunk) => chunk.kind));
  return kinds.has('methods') && kinds.has('results');
}

function parseDocument(value: unknown, fetchedAt: string): ScientificSourceDocument | null {
  const document = record(value);
  const passages = Array.isArray(document.passages) ? document.passages : [];
  const { identifiers, pmid, pmcid, license } = documentIdentity(document, passages);
  if (!/^\d+$/.test(pmid) || !/^PMC\d+$/i.test(pmcid) || !permitsFormeReuse(license)) return null;
  const sourceId = `pmid:${pmid}`;
  const chunks = passageChunks(passages, sourceId, pmcid);
  const title = documentTitle(passages);
  if (!hasAssessmentSections(chunks) || !title) return null;
  return {
    sourceId, provider: 'pmc', externalId: pmcid, title,
    doi: text(identifiers['article-id_doi']) || undefined, pmid, pmcid,
    publicationTypes: ['PMC Open Access full text'], recordStatus: 'active',
    contentLevel: 'full_text', chunks,
    reuseRights: { status: 'permitted', license, origin: 'pmc_open_access' }, fetchedAt,
  };
}

export function parsePmcOpenAccess(payload: unknown, fetchedAt: string): ScientificSourceDocument[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((collection) => {
    const documents = record(collection).documents;
    return Array.isArray(documents)
      ? documents.flatMap((document) => parseDocument(document, fetchedAt) ?? [])
      : [];
  });
}

export class PmcOpenAccessLoader implements ScientificSourceDocumentLoader {
  readonly provider = 'pmc' as const;
  private readonly fetcher: Fetcher;
  private readonly now: () => Date;

  constructor(options: PmcLoaderOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async load(externalIds: string[]): Promise<ScientificSourceDocument[]> {
    const ids = externalIds.filter((id) => /^\d+$/.test(id)).slice(0, 10);
    if (ids.length === 0) return [];
    const url = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/${ids.join(',')}/unicode`;
    const response = await this.fetcher(url);
    if (!response.ok) throw new Error(`PMC Open Access fetch failed: ${response.status}`);
    return parsePmcOpenAccess(await response.json(), this.now().toISOString());
  }
}
