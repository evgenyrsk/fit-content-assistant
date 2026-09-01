import type { LlmProvider } from '../ports/llm-provider.ts';
import type { ModelRunRecord } from './model-run.ts';
import { stageBudget, type BudgetProfile } from './pipeline-budget.ts';
import { sourceAssessmentSchema, validateSourceAssessmentDraft } from './source-assessment-contract.ts';
import { sourceAssessmentPrompt } from './source-assessment-prompt.ts';
import { selectAssessmentPassages } from './select-assessment-passages.ts';
import { evaluateStudyGate, methodologyRelease } from '../../domain/evidence-policy.ts';
import { routeAppraisal } from '../../domain/evidence-routing.ts';
import { hasAssessmentGradeProvenance, type ScientificSourceDocument, type SourceAssessmentRecord } from '../../domain/index.ts';

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
}

function failureCode(error: unknown): NonNullable<SourceAssessmentExecution['failure']> {
  if (!(error instanceof Error)) return 'provider_error';
  if (error.message === 'Assessment cited an unknown passage.') return 'invalid_provenance';
  if (/structured output|runtime contract/i.test(error.message)) return 'invalid_model_output';
  return 'provider_error';
}

function inputText(question: string, document: ScientificSourceDocument): string {
  return JSON.stringify({
    question,
    source: {
      sourceId: document.sourceId, title: document.title,
      publicationTypes: document.publicationTypes, contentLevel: document.contentLevel,
      passages: document.chunks.map((chunk) => ({ id: chunk.id, locator: chunk.locator, text: chunk.text })),
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

function provenanceIsValid(document: ScientificSourceDocument, ids: string[][]): boolean {
  const allowed = new Set(document.chunks.map((chunk) => chunk.id));
  return ids.flat().every((id) => allowed.has(id));
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
  try {
    const budget = stageBudget('source_assessment', options.budgetProfile);
    const result = await options.provider.generateStructured<unknown>({
      model: options.model, system: sourceAssessmentPrompt.system,
      input: inputText(question, assessmentDocument), schemaName: 'forme_source_assessment',
      outputSchema: sourceAssessmentSchema, maxOutputTokens: budget.maxOutputTokens, maxToolCalls: 0,
      metadata: { runId: options.researchRunId, stage: 'source_assessment', promptVersion: sourceAssessmentPrompt.version },
    });
    const draft = validateSourceAssessmentDraft(result.output);
    const provenanceIds = [draft.finding, ...draft.dimensions, ...draft.integrityChecks].map((item) => item.provenanceIds);
    if (!provenanceIsValid(assessmentDocument, provenanceIds)) throw new Error('Assessment cited an unknown passage.');
    const input = {
      ...draft,
      sourceId: document.sourceId,
      recordStatus: document.recordStatus,
      hasStableIdentifier: Boolean(document.pmid || document.doi),
      provenanceComplete: hasAssessmentGradeProvenance(assessmentDocument),
      dimensions: draft.dimensions.map((item) => ({ ...item, assessor: 'model_draft' as const })),
      integrityChecks: draft.integrityChecks.map((item) => ({ ...item, assessor: 'model_draft' as const })),
    };
    const assessment: SourceAssessmentRecord = {
      id: crypto.randomUUID(), researchRunId: options.researchRunId,
      input, finding: draft.finding, route: routeAppraisal(input.questionType, input.studyDesign),
      gate: evaluateStudyGate(input), methodologyVersion: methodologyRelease.version,
      assessor: 'model_draft', createdAt: clock().toISOString(),
    };
    return {
      status: 'model_draft', assessment,
      modelRun: {
        ...modelRun, provider: result.provider, model: result.model,
        routedProvider: result.routedProvider, completedAt: assessment.createdAt,
        inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens,
        costUsd: result.costUsd,
      },
    };
  } catch (error) {
    return {
      status: 'needs_review', assessment: null, failure: failureCode(error),
      modelRun: { ...modelRun, completedAt: clock().toISOString() },
    };
  }
}
