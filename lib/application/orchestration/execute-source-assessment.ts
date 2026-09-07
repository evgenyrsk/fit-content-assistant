import type { LlmExecutionResult, LlmProvider } from '../ports/llm-provider.ts';
import type { ModelRunRecord } from './model-run.ts';
import { stageBudget, type BudgetProfile } from './pipeline-budget.ts';
import {
  sourceAssessmentSchema, studyDesignValues, validateSourceAssessmentDraft,
  type SourceAssessmentDraft,
} from './source-assessment-contract.ts';
import { sourceAssessmentPrompt } from './source-assessment-prompt.ts';
import { selectAssessmentPassages } from './select-assessment-passages.ts';
import { evaluateStudyGate, methodologyRelease } from '../../domain/evidence-policy.ts';
import { routeAppraisal } from '../../domain/evidence-routing.ts';
import type { StudyDesign } from '../../domain/evidence-methodology.ts';
import { requiredIntegrityChecks } from '../../domain/study-integrity-policy.ts';
import {
  calculateSourceTrustProfile,
  hasAssessmentGradeProvenance,
  type ScientificSourceDocument,
  type SourceAssessmentRecord,
} from '../../domain/index.ts';

interface SourceAssessmentExecutionOptions {
  provider: LlmProvider;
  model: string;
  budgetProfile: BudgetProfile;
  researchRunId: string;
  now?: () => Date;
  createId?: () => string;
}

export interface SourceAssessmentExecution {
  status: 'model_draft' | 'needs_review';
  assessment: SourceAssessmentRecord | null;
  modelRun: ModelRunRecord;
  failure?: 'input_unavailable' | 'provider_error' | 'invalid_model_output' | 'invalid_provenance';
  failureDetail?: string;
}

function failureCode(error: unknown): NonNullable<SourceAssessmentExecution['failure']> {
  if (!(error instanceof Error)) return 'provider_error';
  if (error.message === 'Assessment cited an unknown passage.') return 'invalid_provenance';
  if (/structured output|runtime contract/i.test(error.message)) return 'invalid_model_output';
  return 'provider_error';
}

function passageAlias(index: number): string { return `p${index + 1}`; }
function retryToolCalls(retried: boolean): string[] { return retried ? ['structured_output_retry'] : []; }

interface ValidatedAssessmentDraft {
  draft: SourceAssessmentDraft;
  result: LlmExecutionResult<unknown>;
  retried: boolean;
}

function runtimeContractIssue(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  return /strict runtime contract: ([a-z_]+)\./i.exec(error.message)?.[1] ?? null;
}

function draftStudyDesign(output: unknown): StudyDesign | null {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) return null;
  const value = (output as Record<string, unknown>).studyDesign;
  return studyDesignValues.includes(value as StudyDesign) ? value as StudyDesign : null;
}

function repairInstruction(error: unknown, output: unknown, document: ScientificSourceDocument): string {
  const failure = failureCode(error);
  const issue = runtimeContractIssue(error);
  const design = draftStudyDesign(output);
  const checks = issue === 'integrity_checks' && design ? requiredIntegrityChecks(design) : [];
  const checkGuide = checks.length > 0
    ? ` Keep studyDesign=${design}. Return integrityChecks with exactly ${checks.length} entries in this exact order: ${checks.join(', ')}.`
    : '';
  const dimensionGuide = issue === 'dimensions'
    ? ' Return every required dimension exactly once in the schema order.' : '';
  const briefGuide = issue === 'reader_brief'
    ? ' Return 3-5 key points including main_result, method, and limitation.' : '';
  const issueGuide = issue ? ` Runtime validation issue: ${issue}.` : '';
  const aliases = document.chunks.map((_, index) => passageAlias(index)).join(', ');
  return `The previous response was rejected as ${failure}.${issueGuide}${checkGuide}${dimensionGuide}${briefGuide} Regenerate the complete JSON from scratch. Use only these passage aliases: ${aliases}. Recheck every schema field before returning.`;
}

function inputText(question: string, document: ScientificSourceDocument): string {
  return JSON.stringify({
    question,
    source: {
      sourceId: document.sourceId, title: document.title,
      publicationTypes: document.publicationTypes, contentLevel: document.contentLevel,
      passages: document.chunks.map((chunk, index) => ({
        id: passageAlias(index), locator: chunk.locator, text: chunk.text,
      })),
    },
  });
}

function baseRecord(options: SourceAssessmentExecutionOptions, document: ScientificSourceDocument, timestamp: string): ModelRunRecord {
  return {
    runId: (options.createId ?? (() => crypto.randomUUID()))(), researchRunId: options.researchRunId,
    stage: 'source_assessment', provider: options.provider.id, model: options.model,
    promptVersion: sourceAssessmentPrompt.version, startedAt: timestamp, completedAt: timestamp,
    retrievedIds: document.chunks.map((chunk) => chunk.id), toolCalls: [], decision: 'needs_review',
  };
}

async function generateValidatedDraft(
  question: string,
  document: ScientificSourceDocument,
  options: SourceAssessmentExecutionOptions,
  onRepair: () => void,
): Promise<ValidatedAssessmentDraft> {
  const budget = stageBudget('source_assessment', options.budgetProfile);
  let repair = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let draftOutput: unknown;
    try {
      const result = await options.provider.generateStructured<unknown>({
        model: options.model,
        system: repair ? `${sourceAssessmentPrompt.system} ${repair}` : sourceAssessmentPrompt.system,
        input: inputText(question, document), schemaName: 'forme_source_assessment',
        outputSchema: sourceAssessmentSchema, maxOutputTokens: budget.maxOutputTokens, maxToolCalls: 0,
        metadata: { runId: options.researchRunId, stage: 'source_assessment', promptVersion: sourceAssessmentPrompt.version },
      });
      draftOutput = result.output;
      const draft = restoreProvenance(document, validateSourceAssessmentDraft(result.output));
      return { draft, result, retried: attempt > 0 };
    } catch (error) {
      const retryable = ['invalid_model_output', 'invalid_provenance'].includes(failureCode(error));
      if (attempt === 0 && retryable) {
        onRepair();
        repair = repairInstruction(error, draftOutput, document);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Source assessment retry exhausted.');
}

function restoreProvenance(document: ScientificSourceDocument, draft: SourceAssessmentDraft): SourceAssessmentDraft {
  const aliases = new Map(document.chunks.map((chunk, index) => [passageAlias(index), chunk.id]));
  const restore = (ids: string[]) => ids.map((id) => {
    const sourceId = aliases.get(id);
    if (!sourceId) throw new Error('Assessment cited an unknown passage.');
    return sourceId;
  });
  return {
    ...draft,
    finding: { ...draft.finding, provenanceIds: restore(draft.finding.provenanceIds) },
    readerBrief: {
      ...draft.readerBrief,
      studySnapshot: {
        population: { ...draft.readerBrief.studySnapshot.population, provenanceIds: restore(draft.readerBrief.studySnapshot.population.provenanceIds) },
        sampleSize: { ...draft.readerBrief.studySnapshot.sampleSize, provenanceIds: restore(draft.readerBrief.studySnapshot.sampleSize.provenanceIds) },
        groups: { ...draft.readerBrief.studySnapshot.groups, provenanceIds: restore(draft.readerBrief.studySnapshot.groups.provenanceIds) },
      },
      keyPoints: draft.readerBrief.keyPoints.map((item) => ({
        ...item, provenanceIds: restore(item.provenanceIds),
      })),
    },
    dimensions: draft.dimensions.map((item) => ({ ...item, provenanceIds: restore(item.provenanceIds) })),
    integrityChecks: draft.integrityChecks.map((item) => ({ ...item, provenanceIds: restore(item.provenanceIds) })),
  };
}

export async function executeSourceAssessment(
  question: string,
  document: ScientificSourceDocument,
  options: SourceAssessmentExecutionOptions,
): Promise<SourceAssessmentExecution> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const assessmentDocument = selectAssessmentPassages(document);
  const modelRun = baseRecord(options, assessmentDocument, startedAt);
  if (!options.provider.supports('structured_output', options.model) || assessmentDocument.chunks.length === 0) {
    return { status: 'needs_review', assessment: null, modelRun, failure: 'input_unavailable' };
  }
  let repairAttempted = false;
  try {
    const { draft, result, retried } = await generateValidatedDraft(
      question, assessmentDocument, options, () => { repairAttempted = true; },
    );
    const { readerBrief, ...appraisalDraft } = draft;
    const input = {
      ...appraisalDraft,
      sourceId: document.sourceId,
      recordStatus: document.recordStatus,
      hasStableIdentifier: Boolean(document.pmid || document.doi),
      provenanceComplete: hasAssessmentGradeProvenance(assessmentDocument),
      dimensions: draft.dimensions.map((item) => ({ ...item, assessor: 'model_draft' as const })),
      integrityChecks: draft.integrityChecks.map((item) => ({ ...item, assessor: 'model_draft' as const })),
    };
    const gate = evaluateStudyGate(input);
    const assessment: SourceAssessmentRecord = {
      id: crypto.randomUUID(), researchRunId: options.researchRunId,
      input, finding: draft.finding, readerBrief,
      trustProfile: calculateSourceTrustProfile(input, gate),
      route: routeAppraisal(input.questionType, input.studyDesign), gate,
      methodologyVersion: methodologyRelease.version,
      assessor: 'model_draft', createdAt: clock().toISOString(),
    };
    return {
      status: 'model_draft', assessment,
      modelRun: {
        ...modelRun, provider: result.provider, model: result.model,
        routedProvider: result.routedProvider, completedAt: assessment.createdAt,
        inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens,
        costUsd: result.costUsd, toolCalls: retryToolCalls(retried),
      },
    };
  } catch (error) {
    return {
      status: 'needs_review', assessment: null, failure: failureCode(error),
      failureDetail: error instanceof Error ? error.message.slice(0, 160) : 'unknown_error',
      modelRun: {
        ...modelRun, completedAt: clock().toISOString(),
        toolCalls: retryToolCalls(repairAttempted),
      },
    };
  }
}
