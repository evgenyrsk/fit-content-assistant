import { readFile } from 'node:fs/promises';
import process from 'node:process';
import type { ScientificSourceCandidate } from '../../lib/domain/index.ts';
import { rankScientificCandidates } from '../../lib/application/use-cases/rank-scientific-candidates.ts';

interface RetrievalCase {
  id: string;
  question: string;
  population: string;
  intervention: string;
  outcomes: string[];
  relevantTitle: string;
  distractorTitle: string;
}

interface RealCandidate {
  pmid: string; title: string; sourceType: string; relevant: boolean; fullText: boolean;
}

interface RealRetrievalSnapshot {
  snapshotDate: string;
  reviewMethod: string;
  focus: { question: string; population: string; intervention: string; outcomes: string[] };
  candidates: RealCandidate[];
}

function source(id: string, title: string, sourceType: string): ScientificSourceCandidate {
  return {
    id: `pubmed:${id}`, provider: 'pubmed', title, sourceType, authors: [], pmid: id,
    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, discoveredAt: '2026-09-07T00:00:00.000Z',
  };
}

const datasetUrl = new URL('../../evals/scientific-retrieval-v1.json', import.meta.url);
const cases = JSON.parse(await readFile(datasetUrl, 'utf8')) as RetrievalCase[];
let topOneHits = 0;
let recallAtThreeHits = 0;

for (const item of cases) {
  const candidates = [
    source(`${item.id}-d`, item.distractorTitle, 'Systematic Review'),
    source(`${item.id}-n`, 'Unrelated nutrition and general wellness report', 'Journal Article'),
    source(`${item.id}-r`, item.relevantTitle, 'Randomized Controlled Trial'),
  ];
  const ranked = rankScientificCandidates(candidates, item, 3);
  const relevantId = `pubmed:${item.id}-r`;
  if (ranked[0]?.id === relevantId) topOneHits += 1;
  if (ranked.some((candidate) => candidate.id === relevantId)) recallAtThreeHits += 1;
}

const precisionAtOne = topOneHits / cases.length;
const recallAtThree = recallAtThreeHits / cases.length;
const realDatasetUrl = new URL('../../evals/real-pubmed-retrieval-v1.json', import.meta.url);
const real = JSON.parse(await readFile(realDatasetUrl, 'utf8')) as RealRetrievalSnapshot;
const realSources = real.candidates.map((item) => source(item.pmid, item.title, item.sourceType));
const reranked = rankScientificCandidates(realSources, real.focus, realSources.length);
const relevantPmids = new Set(real.candidates.filter((item) => item.relevant).map((item) => item.pmid));
const totalRelevant = relevantPmids.size;
const measure = (items: ScientificSourceCandidate[]) => {
  const topTen = items.slice(0, 10);
  const relevant = topTen.filter((item) => item.pmid && relevantPmids.has(item.pmid));
  const fullTextRelevant = relevant.filter((item) => real.candidates.find((candidate) => candidate.pmid === item.pmid)?.fullText);
  return {
    recallAt10: relevant.length / totalRelevant,
    precisionAt3: items.slice(0, 3).filter((item) => item.pmid && relevantPmids.has(item.pmid)).length / 3,
    relevantFullTextShare: relevant.length ? fullTextRelevant.length / relevant.length : 0,
    irrelevantCandidateShare: topTen.length ? (topTen.length - relevant.length) / topTen.length : 0,
  };
};
console.log(JSON.stringify({
  synthetic: { dataset: 'scientific-retrieval-v1', cases: cases.length, precisionAtOne, recallAtThree },
  realPubmedSnapshot: {
    dataset: 'real-pubmed-retrieval-v1', snapshotDate: real.snapshotDate, reviewMethod: real.reviewMethod,
    candidates: real.candidates.length, before: measure(realSources), after: measure(reranked),
  },
}, null, 2));
if (precisionAtOne < 0.95 || recallAtThree < 1) process.exitCode = 1;
