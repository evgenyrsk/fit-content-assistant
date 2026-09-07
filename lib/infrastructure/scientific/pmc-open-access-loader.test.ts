import assert from 'node:assert/strict';
import test from 'node:test';
import { permitsFormeReuse, PmcOpenAccessLoader, parsePmcOpenAccess } from './pmc-open-access-loader.ts';

function fixture(license = 'CC BY') {
  return [{ source: 'PMC', documents: [{
    id: 'PMC123', infons: { license },
    passages: [
      { offset: 0, infons: { section_type: 'TITLE', type: 'front', 'article-id_pmid': '42', 'article-id_pmc': 'PMC123', 'article-id_doi': '10.1/test' }, text: 'Open study' },
      { offset: 20, infons: { section_type: 'ABSTRACT', type: 'abstract' }, text: 'A sufficiently detailed abstract paragraph for provenance.' },
      { offset: 80, infons: { section_type: 'METHODS', type: 'paragraph' }, text: 'Participants were randomized and followed for twelve weeks.' },
      { offset: 150, infons: { section_type: 'RESULTS', type: 'paragraph' }, text: 'The prespecified primary outcome and confidence interval were reported.' },
      { offset: 230, infons: { section_type: 'REF', type: 'ref' }, text: 'Reference that must not enter evidence chunks.' },
    ],
  }] }];
}

test('accepts commercial-reuse licenses and rejects restrictive variants', () => {
  assert.equal(permitsFormeReuse('CC BY'), true);
  assert.equal(permitsFormeReuse('CC BY-SA 4.0'), true);
  assert.equal(permitsFormeReuse('CC BY-NC'), false);
  assert.equal(permitsFormeReuse('CC BY-ND'), false);
});

test('parses assessment sections with exact PMC offsets and license', () => {
  const [document] = parsePmcOpenAccess(fixture(), '2026-08-27T00:00:00.000Z');
  assert.equal(document.sourceId, 'pmid:42');
  assert.equal(document.pmcid, 'PMC123');
  assert.equal(document.contentLevel, 'full_text');
  assert.equal(document.reuseRights?.license, 'CC BY');
  assert.deepEqual(document.chunks.map((chunk) => chunk.kind), ['abstract', 'methods', 'results']);
  assert.equal(document.chunks[1].locator, 'PMC123:methods:offset-80');
});

test('normalizes the numeric identifiers returned by the official PMC BioC API', () => {
  const numericIdentifiers = fixture();
  numericIdentifiers[0].documents[0].id = '10180745';
  numericIdentifiers[0].documents[0].passages[0].infons['article-id_pmc'] = '10180745';
  const [document] = parsePmcOpenAccess(numericIdentifiers, '2026-08-27T00:00:00.000Z');
  assert.equal(document.pmcid, 'PMC10180745');
});

test('uses the PubMed identity when a PMC BioC response omits the PMID', () => {
  const withoutPmid = fixture();
  delete withoutPmid[0].documents[0].passages[0].infons['article-id_pmid'];
  const [document] = parsePmcOpenAccess(
    withoutPmid, '2026-08-27T00:00:00.000Z', new Map([['PMC123', '42']]),
  );
  assert.equal(document.sourceId, 'pmid:42');
});

test('rejects restrictive licenses and incomplete section coverage', () => {
  assert.deepEqual(parsePmcOpenAccess(fixture('CC BY-NC'), '2026-08-27T00:00:00.000Z'), []);
  const incomplete = fixture();
  incomplete[0].documents[0].passages = incomplete[0].documents[0].passages.filter((item) => item.infons.section_type !== 'RESULTS');
  assert.deepEqual(parsePmcOpenAccess(incomplete, '2026-08-27T00:00:00.000Z'), []);
});

test('loads several PMIDs through one PMC Open Access request', async () => {
  let requestedUrl = '';
  const loader = new PmcOpenAccessLoader({
    fetcher: async (input) => { requestedUrl = String(input); return Response.json(fixture()); },
    now: () => new Date('2026-08-27T00:00:00.000Z'),
  });
  const documents = await loader.load(['PMC42', '43', 'invalid']);
  assert.match(requestedUrl, /PMC42,PMC43/);
  assert.equal(documents.length, 1);
});
