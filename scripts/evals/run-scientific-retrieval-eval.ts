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
console.log(JSON.stringify({ dataset: 'scientific-retrieval-v1', cases: cases.length, precisionAtOne, recallAtThree }, null, 2));
if (precisionAtOne < 0.95 || recallAtThree < 1) process.exitCode = 1;
