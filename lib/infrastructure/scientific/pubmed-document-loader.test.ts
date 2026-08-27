import assert from 'node:assert/strict';
import test from 'node:test';
import { PubmedDocumentLoader, parsePubmedDocuments } from './pubmed-document-loader.ts';

const fixture = `<?xml version="1.0"?><PubmedArticleSet><PubmedArticle><MedlineCitation>
<PMID>123</PMID><Article><ArticleTitle>Creatine &amp; strength</ArticleTitle><Abstract>
<AbstractText Label="METHODS">Randomized trial methods.</AbstractText>
<AbstractText Label="RESULTS">Strength increased.</AbstractText></Abstract>
<PublicationTypeList><PublicationType>Randomized Controlled Trial</PublicationType></PublicationTypeList>
</Article></MedlineCitation><PubmedData><ArticleIdList><ArticleId IdType="doi">10.1000/test</ArticleId><ArticleId IdType="pmc">PMC123</ArticleId></ArticleIdList>
</PubmedData></PubmedArticle></PubmedArticleSet>`;

test('parses section-level abstract provenance without calling it full text', () => {
  const [document] = parsePubmedDocuments(fixture, '2026-08-27T00:00:00.000Z');
  assert.equal(document.sourceId, 'pmid:123');
  assert.equal(document.title, 'Creatine & strength');
  assert.equal(document.pmcid, 'PMC123');
  assert.equal(document.contentLevel, 'abstract_only');
  assert.equal(document.chunks[0].locator, 'abstract:methods');
  assert.equal(document.chunks[1].text, 'Strength increased.');
  assert.equal(document.recordStatus, 'active');
});

test('recognizes a retracted PubMed record before model assessment', () => {
  const retracted = fixture.replace('Randomized Controlled Trial', 'Retracted Publication');
  assert.equal(parsePubmedDocuments(retracted, '2026-08-27T00:00:00.000Z')[0].recordStatus, 'retracted');
});

test('loads multiple PubMed records in one EFetch request', async () => {
  let requestedUrl = '';
  const loader = new PubmedDocumentLoader({
    fetcher: async (input) => { requestedUrl = String(input); return new Response(fixture); },
    now: () => new Date('2026-08-27T00:00:00.000Z'),
  });
  const documents = await loader.load(['123', 'invalid']);
  assert.match(requestedUrl, /id=123/);
  assert.equal(documents.length, 1);
});
