import type { LlmProvider } from '../ports/llm-provider.ts';
import {
  clampClaimConfidence, evaluateClaimDraftPreparation,
  type BodyAssessmentRecord, type BodyCertainty, type ClaimDraftPreparationGate,
  type ClaimDraftRecord, type Confidence, type SourceAssessmentSummary,
} from '../../domain/index.ts';
import type { ModelRunRecord } from './model-run.ts';
import { stageBudget, type BudgetProfile } from './pipeline-budget.ts';
import { claimSynthesisSchema, validateClaimSynthesisDraft } from './claim-synthesis-contract.ts';
import { claimSynthesisPrompt } from './claim-synthesis-prompt.ts';

interface ClaimSynthesisOptions {
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
  researchRunId: string;
  now?: () => Date;
  createId?: () => string;
}

export interface ClaimSynthesisExecution {
  status: 'model_draft' | 'needs_review';
  claim: ClaimDraftRecord | null;
  gate: ClaimDraftPreparationGate;
  modelRun: ModelRunRecord;
}

function baseRecord(options: ClaimSynthesisOptions, body: BodyAssessmentRecord, timestamp: string): ModelRunRecord {
  return {
    runId: (options.createId ?? (() => crypto.randomUUID()))(), researchRunId: options.researchRunId,
    stage: 'claim_synthesis', provider: options.provider.id, model: options.model,
    promptVersion: claimSynthesisPrompt.version, startedAt: timestamp, completedAt: timestamp,
    retrievedIds: [body.id, ...body.assessment.eligibleStudyAssessmentIds],
    toolCalls: [], decision: 'needs_review',
  };
}

function confidenceAllowed(claim: Confidence, body: BodyCertainty): boolean {
  const ranks: Record<Confidence | BodyCertainty, number> = {
    high: 4, moderate: 3, low: 2, very_low: 1, insufficient: 0,
  };
  const normalizedClaim = claim === 'low' && body === 'very_low' ? 1 : ranks[claim];
  return normalizedClaim <= ranks[body];
}

function mergeLimitations(generated: string[], required: string[]): string[] {
  const normalized = new Set(generated.map((item) => item.trim().toLocaleLowerCase('ru-RU')));
  const additions = required.filter((item) => !normalized.has(item.toLocaleLowerCase('ru-RU')));
  return [...additions, ...generated].slice(0, 12);
}

function evidenceReferencesAreValid(
  evidence: Array<{ sourceAssessmentId?: string; sourceChunkId: string }>,
  summaries: SourceAssessmentSummary[],
  eligibleAssessmentIds: string[],
): boolean {
  const eligible = new Set(eligibleAssessmentIds);
  const byAssessment = new Map(summaries
    .filter((summary) => eligible.has(summary.id)
      && summary.decision === 'eligible_for_synthesis'
      && summary.humanReview?.decision === 'confirmed')
    .map((summary) => [summary.id, new Set(summary.finding.provenanceIds)]));
  return evidence.every((item) => Boolean(item.sourceAssessmentId)
    && byAssessment.get(item.sourceAssessmentId as string)?.has(item.sourceChunkId) === true);
}

async function stableKey(statement: string, scope: Record<string, unknown>): Promise<string> {
  const input = new TextEncoder().encode(`${statement.trim().toLowerCase()}|${JSON.stringify(scope)}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function executeClaimSynthesis(
  body: BodyAssessmentRecord,
  summaries: SourceAssessmentSummary[],
  options: ClaimSynthesisOptions,
): Promise<ClaimSynthesisExecution> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const modelRun = baseRecord(options, body, startedAt);
  const gate = evaluateClaimDraftPreparation(body.assessment, summaries);
  if (gate.decision === 'blocked' || !options.provider.supports('structured_output', options.model)) {
    return { status: 'needs_review', claim: null, gate, modelRun };
  }
  try {
    const budget = stageBudget('claim_synthesis', options.budgetProfile);
    const allowedEvidence = summaries
      .filter((summary) => body.assessment.eligibleStudyAssessmentIds.includes(summary.id)
        && summary.decision === 'eligible_for_synthesis'
        && summary.humanReview?.decision === 'confirmed')
      .map((summary) => `${summary.id}: ${summary.finding.provenanceIds.join(', ')}`)
      .join('; ');
    const result = await options.provider.generateStructured<unknown>({
      model: options.model,
      system: `${claimSynthesisPrompt.system} Cite evidence only from these exact assessment and passage ids: ${allowedEvidence}.`,
      input: JSON.stringify({ bodyAssessment: body, claimDraftPolicy: gate, sourceAssessments: summaries }),
      schemaName: 'forme_claim_synthesis', outputSchema: claimSynthesisSchema,
      maxOutputTokens: budget.maxOutputTokens, maxToolCalls: 0,
      metadata: { runId: options.researchRunId, stage: 'claim_synthesis', promptVersion: claimSynthesisPrompt.version },
    });
    const draft = validateClaimSynthesisDraft(result.output);
    if (!confidenceAllowed(draft.confidence, body.assessment.proposedCertainty)
      || !evidenceReferencesAreValid(
        draft.evidence, summaries, body.assessment.eligibleStudyAssessmentIds,
      )
      || Date.parse(draft.reviewDueAt) <= Date.parse(startedAt)) {
      throw new Error('Claim exceeded the body assessment or cited unknown evidence.');
    }
    const createdAt = clock().toISOString();
    const claim: ClaimDraftRecord = {
      id: crypto.randomUUID(), stableKey: await stableKey(draft.statement, draft.scope),
      ...draft, confidence: clampClaimConfidence(draft.confidence, gate.confidenceCeiling),
      limitations: mergeLimitations(draft.limitations, gate.requiredLimitations),
      status: 'needs_review', methodologyVersion: body.assessment.methodologyVersion, createdAt,
    };
    return {
      status: 'model_draft', claim, gate,
      modelRun: {
        ...modelRun, provider: result.provider, model: result.model,
        routedProvider: result.routedProvider, completedAt: createdAt,
        inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens,
        costUsd: result.costUsd,
      },
    };
  } catch {
    return { status: 'needs_review', claim: null, gate, modelRun: { ...modelRun, completedAt: clock().toISOString() } };
  }
}
