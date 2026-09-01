import type { PipelineStageId } from './pipeline.ts';

export type BudgetProfile = 'economy' | 'balanced';
export type ModelRole = 'research' | 'content' | 'review';

export interface StageBudget {
  role: ModelRole;
  maxOutputTokens: number;
  maxToolCalls: number;
}

const researchStages: PipelineStageId[] = [
  'research_plan', 'source_assessment', 'body_assessment', 'claim_synthesis', 'claim_review',
];

function outputBudget(profile: BudgetProfile, role: ModelRole, structuredAssessment: boolean): number {
  if (structuredAssessment) return profile === 'economy' ? 3200 : 4200;
  if (profile === 'economy') return role === 'content' ? 900 : 1800;
  return role === 'content' ? 1600 : 3200;
}

export function stageBudget(stage: PipelineStageId, profile: BudgetProfile): StageBudget {
  const role: ModelRole = stage === 'fact_review' ? 'review'
    : researchStages.includes(stage) ? 'research' : 'content';
  const researchGrade = role !== 'content';
  const structuredAssessment = stage === 'source_assessment' || stage === 'body_assessment';
  return {
    role, maxOutputTokens: outputBudget(profile, role, structuredAssessment),
    maxToolCalls: profile === 'economy' ? (researchGrade ? 4 : 1) : (researchGrade ? 8 : 2),
  };
}
