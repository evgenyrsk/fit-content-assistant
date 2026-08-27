import type { LlmProvider } from '../ports/llm-provider.ts';
import { evaluateBodyGate, type BodyAssessmentRecord, type SourceAssessmentSummary } from '../../domain/index.ts';
import type { ModelRunRecord } from './model-run.ts';
import { stageBudget, type BudgetProfile } from './pipeline-budget.ts';
import { bodyAssessmentSchema, validateBodyAssessmentDraft } from './body-assessment-contract.ts';
import { bodyAssessmentPrompt } from './body-assessment-prompt.ts';

interface BodyAssessmentExecutionOptions {
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
  researchRunId: string;
  methodologyVersion: string;
  methodologyCalibrated: boolean;
  now?: () => Date;
  createId?: () => string;
}

export interface BodyAssessmentExecution {
  status: 'model_draft' | 'needs_review';
  body: BodyAssessmentRecord | null;
  modelRun: ModelRunRecord;
}

function baseRecord(options: BodyAssessmentExecutionOptions, summaries: SourceAssessmentSummary[], timestamp: string): ModelRunRecord {
  return {
    runId: (options.createId ?? (() => crypto.randomUUID()))(), researchRunId: options.researchRunId,
    stage: 'body_assessment', provider: options.provider.id, model: options.model,
    promptVersion: bodyAssessmentPrompt.version, startedAt: timestamp, completedAt: timestamp,
    retrievedIds: summaries.map((summary) => summary.id), toolCalls: [], decision: 'needs_review',
  };
}

function sameIds(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

function referencesAreValid(
  eligible: string[],
  contradictory: string[],
  domainIds: string[][],
  summaries: SourceAssessmentSummary[],
): boolean {
  const allowed = summaries.map((summary) => summary.id);
  const expectedEligible = summaries.filter((summary) => summary.decision === 'eligible_for_synthesis').map((summary) => summary.id);
  const expectedContradictory = summaries
    .filter((summary) => ['contradicting', 'mixed'].includes(summary.finding.direction))
    .map((summary) => summary.id);
  return sameIds(eligible, expectedEligible)
    && contradictory.every((id) => expectedContradictory.includes(id))
    && domainIds.flat().every((id) => allowed.includes(id));
}

export async function executeBodyAssessment(
  question: string,
  outcomeId: string,
  summaries: SourceAssessmentSummary[],
  options: BodyAssessmentExecutionOptions,
): Promise<BodyAssessmentExecution> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const modelRun = baseRecord(options, summaries, startedAt);
  const eligible = summaries.filter((summary) => summary.decision === 'eligible_for_synthesis');
  if (!options.provider.supports('structured_output', options.model) || eligible.length === 0) {
    return { status: 'needs_review', body: null, modelRun };
  }
  try {
    const budget = stageBudget('body_assessment', options.budgetProfile);
    const result = await options.provider.generateStructured<unknown>({
      model: options.model, system: bodyAssessmentPrompt.system,
      input: JSON.stringify({ question, outcomeId, sourceAssessments: summaries }),
      schemaName: 'forme_body_assessment', outputSchema: bodyAssessmentSchema,
      maxOutputTokens: budget.maxOutputTokens, maxToolCalls: 0,
      metadata: { runId: options.researchRunId, stage: 'body_assessment', promptVersion: bodyAssessmentPrompt.version },
    });
    const draft = validateBodyAssessmentDraft(result.output);
    const domainIds = draft.domains.map((domain) => domain.supportingAssessmentIds);
    if (!referencesAreValid(draft.eligibleStudyAssessmentIds, draft.contradictoryStudyAssessmentIds, domainIds, summaries)) {
      throw new Error('Body assessment referenced an invalid source assessment.');
    }
    const assessment = {
      ...draft, questionId: options.researchRunId, outcomeId,
      domains: draft.domains.map((domain) => ({ ...domain, assessor: 'model_draft' as const })),
      humanReview: 'pending' as const, methodologyVersion: options.methodologyVersion,
    };
    const createdAt = clock().toISOString();
    const body: BodyAssessmentRecord = {
      id: crypto.randomUUID(), researchRunId: options.researchRunId, assessment,
      gate: evaluateBodyGate(assessment, options.methodologyCalibrated), createdAt,
    };
    return {
      status: 'model_draft', body,
      modelRun: {
        ...modelRun, provider: result.provider, model: result.model,
        routedProvider: result.routedProvider, completedAt: createdAt,
        inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens,
        costUsd: result.costUsd,
      },
    };
  } catch {
    return { status: 'needs_review', body: null, modelRun: { ...modelRun, completedAt: clock().toISOString() } };
  }
}
