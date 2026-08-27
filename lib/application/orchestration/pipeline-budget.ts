import type { PipelineStageId } from './pipeline.ts';

export type BudgetProfile = 'economy' | 'balanced';
export type ModelRole = 'research' | 'content';

export interface StageBudget {
  role: ModelRole;
  maxOutputTokens: number;
  maxToolCalls: number;
}

const researchStages: PipelineStageId[] = [
  'research_plan', 'source_assessment', 'claim_synthesis', 'claim_review', 'fact_review',
];

export function stageBudget(stage: PipelineStageId, profile: BudgetProfile): StageBudget {
  const research = researchStages.includes(stage);
  if (profile === 'economy') {
    return { role: research ? 'research' : 'content', maxOutputTokens: research ? 1800 : 900, maxToolCalls: research ? 4 : 1 };
  }
  return { role: research ? 'research' : 'content', maxOutputTokens: research ? 3200 : 1600, maxToolCalls: research ? 8 : 2 };
}
