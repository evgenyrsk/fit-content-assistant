import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScientificSourceCandidate } from '../../domain/index.ts';
import { orderFullTextByCandidateRank, rankScientificCandidates, scientificCandidateScore } from './rank-scientific-candidates.ts';

function source(id: string, title: string, sourceType = 'Journal Article'): ScientificSourceCandidate {
  return {
    id: `pubmed:${id}`, provider: 'pubmed', title, authors: [], pmid: id,
    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, sourceType,
    discoveredAt: '2026-09-07T00:00:00.000Z',
  };
}

const creatineFocus = {
  question: 'Does creatine increase strength and muscle mass in healthy adults?',
  population: 'healthy adults', intervention: 'creatine supplementation',
  comparator: 'placebo or resistance training alone', outcomes: ['muscle strength', 'muscle mass'],
};

test('ranks target outcomes above a same-intervention distractor', () => {
  const hair = source('1', 'Does creatine cause hair loss? A randomized controlled trial.', 'Randomized Controlled Trial');
  const strength = source('2', 'Creatine supplementation and resistance training effects on muscle strength and muscle mass.', 'Meta-Analysis');
  assert.ok(scientificCandidateScore(strength, creatineFocus) > scientificCandidateScore(hair, creatineFocus));
  assert.equal(rankScientificCandidates([hair, strength], creatineFocus, 2)[0].pmid, '2');
});

test('keeps ranking deterministic when candidates have the same score', () => {
  const first = source('1', 'Unrelated report one');
  const second = source('2', 'Unrelated report two');
  assert.deepEqual(rankScientificCandidates([first, second], creatineFocus, 2).map((item) => item.pmid), ['1', '2']);
});

test('uses study design only as a tie-break contribution, not an evidence decision', () => {
  const relevantTrial = source('1', 'Creatine supplementation improves muscle strength.', 'Randomized Controlled Trial');
  const irrelevantReview = source('2', 'Omega-3 and recovery in runners.', 'Systematic Review');
  assert.equal(rankScientificCandidates([irrelevantReview, relevantTrial], creatineFocus, 1)[0].pmid, '1');
});

test('keeps assessment-grade full texts in the same order as ranked candidates', () => {
  const coverage = {
    requested: 2, stored: 2, unavailable: 0,
    documents: [
      { sourceId: 'pmid:2', pmcid: 'PMC2', license: 'CC BY', chunkCount: 4 },
      { sourceId: 'pmid:1', pmcid: 'PMC1', license: 'CC BY', chunkCount: 5 },
    ],
  };
  const ranked = [source('1', 'First'), source('2', 'Second')];
  assert.deepEqual(orderFullTextByCandidateRank(coverage, ranked).documents.map((item) => item.sourceId), ['pmid:1', 'pmid:2']);
});
