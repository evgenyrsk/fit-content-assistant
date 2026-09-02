import type {
  DimensionAssessment,
  DimensionJudgement,
  IntegrityCheckState,
  StudyAssessmentInput,
  StudyDimension,
  StudyGateResult,
} from './evidence-methodology.ts';

export type TrustBand = 'very_low' | 'low' | 'moderate' | 'higher';

export interface SourceTrustProfile {
  score: number;
  range: { lower: number; upper: number };
  band: TrustBand;
  coverage: number;
  factors: Array<{ id: 'fit' | 'rigor' | 'transparency'; score: number }>;
  caveats: string[];
}

const dimensionValues: Record<DimensionJudgement, number | null> = {
  low_concern: 1, some_concerns: 0.72, high_concern: 0.35,
  critical: 0, unclear: 0.4, not_applicable: null,
};
const checkValues: Record<IntegrityCheckState, number | null> = {
  adequate: 1, concern: 0.35, unclear: 0.45, not_applicable: null,
};
const factorDimensions: Record<SourceTrustProfile['factors'][number]['id'], StudyDimension[]> = {
  fit: ['question_fit', 'applicability'],
  rigor: ['internal_validity', 'statistical_reliability', 'reporting_integrity'],
  transparency: ['conflicts_transparency', 'record_integrity'],
};

function mean(values: Array<number | null>): number {
  const usable = values.filter((value): value is number => value !== null);
  return usable.length > 0 ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
}

function factorScore(dimensions: DimensionAssessment[], ids: StudyDimension[]): number {
  return Math.round(mean(dimensions.filter((item) => ids.includes(item.dimension))
    .map((item) => dimensionValues[item.judgement])) * 100);
}

function scoreCap(gate: StudyGateResult): number {
  if (gate.decision === 'excluded') return 15;
  if (gate.decision === 'context_only') return 30;
  if (gate.decision === 'needs_human_review') return 69;
  return 88;
}

function band(score: number): TrustBand {
  if (score < 35) return 'very_low';
  if (score < 55) return 'low';
  if (score < 70) return 'moderate';
  return 'higher';
}

export function calculateSourceTrustProfile(input: StudyAssessmentInput, gate: StudyGateResult): SourceTrustProfile {
  const dimensionScores = input.dimensions.map((item) => dimensionValues[item.judgement]);
  const checkScores = input.integrityChecks.map((item) => checkValues[item.state]);
  const raw = mean(dimensionScores) * 0.7 + mean(checkScores) * 0.3;
  const cap = scoreCap(gate);
  const score = Math.min(Math.round(raw * 100), cap);
  const reviewable = [...dimensionScores, ...checkScores].filter((value) => value !== null);
  const assessed = input.dimensions.filter((item) => !['unclear', 'not_applicable'].includes(item.judgement)).length
    + input.integrityChecks.filter((item) => !['unclear', 'not_applicable'].includes(item.state)).length;
  const coverage = reviewable.length > 0 ? Math.round((assessed / reviewable.length) * 100) : 0;
  const spread = 5 + Math.round((100 - coverage) * 0.15);
  const caveats = ['Это ориентир review, а не вероятность истинности результата.'];
  if (gate.decision !== 'eligible_for_synthesis') caveats.push('Score ограничен незакрытым evidence gate.');
  if (coverage < 80) caveats.push('Часть критериев не удалось оценить по доступному тексту.');
  caveats.push('Методология ещё не прошла экспертную калибровку.');
  return {
    score, range: { lower: Math.max(0, score - spread), upper: Math.min(cap, score + spread) },
    band: band(score), coverage,
    factors: (Object.keys(factorDimensions) as Array<SourceTrustProfile['factors'][number]['id']>)
      .map((id) => ({ id, score: factorScore(input.dimensions, factorDimensions[id]) })),
    caveats,
  };
}
