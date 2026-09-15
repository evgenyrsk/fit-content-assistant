import type { LlmExecutionResult, LlmProvider } from '../ports/llm-provider.ts';
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

interface ValidatedBodyDraft {
  draft: ReturnType<typeof validateBodyAssessmentDraft>;
  result: LlmExecutionResult<unknown>;
  retried: boolean;
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

function repairInstruction(error: unknown, summaries: SourceAssessmentSummary[]): string {
  const ids = summaries.map((summary) => summary.id).join(', ');
  const detail = error instanceof Error ? error.message : 'invalid body assessment output';
  return [
    'The previous response was rejected. Regenerate the complete JSON from scratch.',
    `Validation issue: ${detail.slice(0, 180)}.`,
    `Use only these source assessment ids: ${ids}.`,
    'eligibleStudyAssessmentIds must contain exactly the eligible-for-synthesis ids; include all five GRADE domains exactly once.',
    'Return only JSON matching the supplied strict schema.',
  ].join(' ');
}

async function generateValidatedDraft(
  question: string,
  outcomeId: string,
  summaries: SourceAssessmentSummary[],
  options: BodyAssessmentExecutionOptions,
): Promise<ValidatedBodyDraft> {
  const budget = stageBudget('body_assessment', options.budgetProfile);
  const input = JSON.stringify({ question, outcomeId, sourceAssessments: summaries });
  let repair = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await options.provider.generateStructured<unknown>({
        model: options.model,
        system: repair ? `${bodyAssessmentPrompt.system} ${repair}` : bodyAssessmentPrompt.system,
        input, schemaName: 'forme_body_assessment', outputSchema: bodyAssessmentSchema,
        maxOutputTokens: budget.maxOutputTokens, maxToolCalls: 0,
        metadata: { runId: options.researchRunId, stage: 'body_assessment', promptVersion: bodyAssessmentPrompt.version },
      });
      const draft = validateBodyAssessmentDraft(result.output);
      const domainIds = draft.domains.map((domain) => domain.supportingAssessmentIds);
      if (!referencesAreValid(draft.eligibleStudyAssessmentIds, draft.contradictoryStudyAssessmentIds, domainIds, summaries)) {
        throw new Error('Body assessment referenced an invalid source assessment.');
      }
      return { draft, result, retried: attempt > 0 };
    } catch (error) {
      if (attempt === 0) {
        repair = repairInstruction(error, summaries);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Body assessment retry exhausted.');
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
    const { draft, result, retried } = await generateValidatedDraft(question, outcomeId, summaries, options);
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
        costUsd: result.costUsd, toolCalls: retried ? ['structured_output_retry'] : [],
      },
    };
  } catch {
    return { status: 'needs_review', body: null, modelRun: { ...modelRun, completedAt: clock().toISOString() } };
  }
}
