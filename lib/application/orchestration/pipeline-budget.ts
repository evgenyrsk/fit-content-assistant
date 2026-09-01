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

export function stageBudget(stage: PipelineStageId, profile: BudgetProfile): StageBudget {
  const role: ModelRole = stage === 'fact_review' ? 'review'
    : researchStages.includes(stage) ? 'research' : 'content';
  const researchGrade = role !== 'content';
  if (profile === 'economy') {
    return { role, maxOutputTokens: researchGrade ? 1800 : 900, maxToolCalls: researchGrade ? 4 : 1 };
  }
  return { role, maxOutputTokens: researchGrade ? 3200 : 1600, maxToolCalls: researchGrade ? 8 : 2 };
}
