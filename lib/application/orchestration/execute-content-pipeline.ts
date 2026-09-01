import type { LlmProvider } from '../ports/llm-provider.ts';
import type {
  ContentBrief, ContentFormat, ContentItemRecord, ContentPipelineStage,
  ContentStageState, KnowledgeClaimRecord,
} from '../../domain/index.ts';
import { contentBriefSchema, validateContentBriefDraft } from './content-brief-contract.ts';
import { contentBriefPrompt, factReviewPrompt, platformDraftPrompt, voiceEditPrompt } from './content-prompts.ts';
import { executeStructuredContentStage } from './execute-structured-content-stage.ts';
import { factReviewSchema, validateFactReview } from './fact-review-contract.ts';
import type { FactReviewOutput } from './fact-review-contract.ts';
import { missingRequiredCaveats } from './fact-review-preflight.ts';
import type { ModelRunRecord } from './model-run.ts';
import { neutralStyleProfile } from './neutral-style-profile.ts';
import type { BudgetProfile } from './pipeline-budget.ts';
import { platformDraftSchema, validatePlatformDraft } from './platform-draft-contract.ts';
import { validateVoiceEdit, voiceEditSchema } from './voice-edit-contract.ts';
import type { VoiceEditOutput } from './voice-edit-contract.ts';

interface ContentRuntime {
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
}

interface ExecuteContentOptions {
  format: ContentFormat;
  audience: string;
  goal?: string;
  claims: KnowledgeClaimRecord[];
  contentRuntime: ContentRuntime;
  reviewRuntime: ContentRuntime;
  now?: () => Date;
  createId?: () => string;
}

export interface ContentPipelineExecution {
  status: 'needs_review' | 'ready_for_human_review';
  contentItem: ContentItemRecord | null;
  modelRuns: ModelRunRecord[];
  stages: ContentStageState[];
}

const stageOrder: ContentPipelineStage[] = ['content_brief', 'platform_draft', 'voice_edit', 'fact_review'];

function defaultClock(): Date {
  return new Date();
}

function defaultId(): string {
  return crypto.randomUUID();
}

function stageStates(completed: ContentPipelineStage[], blocked?: ContentPipelineStage): ContentStageState[] {
  return stageOrder.map((stage) => ({
    stage,
    status: completed.includes(stage) ? 'complete' : stage === blocked ? 'blocked' : 'waiting',
    message: completed.includes(stage)
      ? 'Контракт пройден.'
      : stage === blocked ? 'Этап остановлен защитным gate.' : 'Ожидает предыдущий этап.',
  }));
}

function selectedClaims(claims: KnowledgeClaimRecord[], ids: readonly string[]): KnowledgeClaimRecord[] {
  const selected = new Set(ids);
  return claims.filter((claim) => selected.has(claim.id));
}

function requiredCaveats(claims: KnowledgeClaimRecord[]): string[] {
  return [...new Set(claims.flatMap((claim) => claim.limitations.map((limitation) => limitation.trim())).filter(Boolean))];
}

function claimInput(claims: KnowledgeClaimRecord[]) {
  return claims.map((claim) => ({
    claimVersionId: claim.id, statement: claim.statement, scope: claim.scope,
    confidence: claim.confidence, limitations: claim.limitations, reviewDueAt: claim.reviewDueAt,
  }));
}

function contentBrief(
  format: ContentFormat,
  audience: string,
  draft: ReturnType<typeof validateContentBriefDraft>,
  claims: KnowledgeClaimRecord[],
): ContentBrief {
  return {
    format, audience, coreIdea: draft.coreIdea, tension: draft.tension,
    practicalValue: draft.practicalValue, requiredClaimVersionIds: draft.selectedClaimVersionIds,
    requiredCaveats: requiredCaveats(claims),
    prohibitedFramings: [
      'Не повышать научную уверенность.',
      'Не расширять популяцию или область применимости.',
      'Не превращать личный опыт в доказательство.',
    ],
    styleProfileVersion: neutralStyleProfile.version,
  };
}

function stopped(
  modelRuns: ModelRunRecord[],
  completed: ContentPipelineStage[],
  blocked: ContentPipelineStage,
): ContentPipelineExecution {
  return { status: 'needs_review', contentItem: null, modelRuns, stages: stageStates(completed, blocked) };
}

function completedExecution(input: {
  contentItemId: string; brief: ContentBrief; format: ContentFormat; draft: VoiceEditOutput;
  review: FactReviewOutput; modelRuns: ModelRunRecord[]; createdAt: string;
}): ContentPipelineExecution {
  const ready = input.review.decision === 'approved';
  const contentItem: ContentItemRecord = {
    id: input.contentItemId, brief: input.brief,
    draft: {
      format: input.format, title: input.draft.title, fragments: input.draft.fragments,
      reviewDecision: input.review.decision, reviewNotes: input.review.notes,
    },
    factReview: {
      decision: input.review.decision, unsupportedFragmentIds: input.review.unsupportedFragmentIds,
      preservedCaveats: input.review.preservedCaveats, notes: input.review.notes,
    },
    status: ready ? 'ready_for_human_review' : 'needs_review',
    styleProfileFallback: true, createdAt: input.createdAt,
  };
  return {
    status: contentItem.status, contentItem, modelRuns: input.modelRuns,
    stages: stageStates(ready ? stageOrder : stageOrder.slice(0, 3), ready ? undefined : 'fact_review'),
  };
}

export async function executeContentPipeline(options: ExecuteContentOptions): Promise<ContentPipelineExecution> {
  const clock = options.now || defaultClock;
  const makeId = options.createId || defaultId;
  const contentItemId = makeId();
  const modelRuns: ModelRunRecord[] = [];
  const allowedClaimIds = new Set(options.claims.map((claim) => claim.id));
  const briefRun = await executeStructuredContentStage({
    stage: 'content_brief', ...options.contentRuntime, contentItemId,
    prompt: contentBriefPrompt, schemaName: 'forme_content_brief', outputSchema: contentBriefSchema,
    input: { format: options.format, audience: options.audience, goal: options.goal, claims: claimInput(options.claims) },
    retrievedIds: [...allowedClaimIds], validate: (value) => validateContentBriefDraft(value, allowedClaimIds),
    now: clock, createId: makeId,
  });
  modelRuns.push(briefRun.modelRun);
  if (!briefRun.output) return stopped(modelRuns, [], 'content_brief');

  const claims = selectedClaims(options.claims, briefRun.output.selectedClaimVersionIds);
  const brief = contentBrief(options.format, options.audience, briefRun.output, claims);
  const selectedIds = new Set(brief.requiredClaimVersionIds);
  const draftRun = await executeStructuredContentStage({
    stage: 'platform_draft', ...options.contentRuntime, contentItemId,
    prompt: platformDraftPrompt, schemaName: 'forme_platform_draft', outputSchema: platformDraftSchema,
    input: { brief, titleAngle: briefRun.output.titleAngle, claims: claimInput(claims) },
    retrievedIds: [...selectedIds],
    validate: (value) => validatePlatformDraft(value, selectedIds, brief.requiredCaveats),
    now: clock, createId: makeId,
  });
  modelRuns.push(draftRun.modelRun);
  if (!draftRun.output) return stopped(modelRuns, ['content_brief'], 'platform_draft');
  const platformDraft = draftRun.output;

  const voiceRun = await executeStructuredContentStage({
    stage: 'voice_edit', ...options.contentRuntime, contentItemId,
    prompt: voiceEditPrompt, schemaName: 'forme_voice_edit', outputSchema: voiceEditSchema,
    input: { draft: platformDraft, requiredCaveats: brief.requiredCaveats, styleProfile: neutralStyleProfile },
    retrievedIds: [...selectedIds],
    validate: (value) => validateVoiceEdit(value, platformDraft, brief.requiredCaveats),
    now: clock, createId: makeId,
  });
  modelRuns.push(voiceRun.modelRun);
  if (!voiceRun.output) return stopped(modelRuns, ['content_brief', 'platform_draft'], 'voice_edit');
  const voiceDraft = voiceRun.output;
  if (missingRequiredCaveats(voiceDraft, brief.requiredCaveats).length > 0) {
    return stopped(modelRuns, ['content_brief', 'platform_draft', 'voice_edit'], 'fact_review');
  }

  const reviewRun = await executeStructuredContentStage({
    stage: 'fact_review', ...options.reviewRuntime, contentItemId,
    prompt: factReviewPrompt, schemaName: 'forme_fact_review', outputSchema: factReviewSchema,
    input: { draft: voiceDraft, claims: claimInput(claims), requiredCaveats: brief.requiredCaveats },
    retrievedIds: [...selectedIds],
    validate: (value) => validateFactReview(value, voiceDraft, brief.requiredCaveats),
    now: clock, createId: makeId,
  });
  if (reviewRun.output) reviewRun.modelRun.decision = reviewRun.output.decision;
  modelRuns.push(reviewRun.modelRun);
  if (!reviewRun.output) return stopped(modelRuns, ['content_brief', 'platform_draft', 'voice_edit'], 'fact_review');

  return completedExecution({
    contentItemId, brief, format: options.format, draft: voiceDraft,
    review: reviewRun.output, modelRuns, createdAt: clock().toISOString(),
  });
}
