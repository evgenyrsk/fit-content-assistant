export type PipelineStageId =
  | 'intent'
  | 'research_plan'
  | 'retrieval'
  | 'source_assessment'
  | 'body_assessment'
  | 'claim_synthesis'
  | 'claim_review'
  | 'knowledge_commit'
  | 'content_brief'
  | 'platform_draft'
  | 'voice_edit'
  | 'fact_review';

export interface PipelineStage {
  id: PipelineStageId;
  purpose: string;
  input: string;
  output: string;
  gate: string;
}

export const FORME_PIPELINE: readonly PipelineStage[] = [
  { id: 'intent', purpose: 'Understand the user job and missing context.', input: 'User request', output: 'Typed intent', gate: 'Intent is sufficiently unambiguous.' },
  { id: 'research_plan', purpose: 'Plan a falsifiable and balanced search.', input: 'Typed intent', output: 'Research plan', gate: 'Includes disconfirming evidence criteria.' },
  { id: 'retrieval', purpose: 'Retrieve existing claims and source candidates.', input: 'Research plan', output: 'Ranked candidates with provenance', gate: 'Coverage and diversity thresholds pass.' },
  { id: 'source_assessment', purpose: 'Assess evidence without writing content.', input: 'Source candidates', output: 'Source assessments', gate: 'Every assessment cites exact passages.' },
  { id: 'body_assessment', purpose: 'Assess certainty for one outcome across eligible studies.', input: 'Source assessments', output: 'Body assessment', gate: 'GRADE domains and contradictory evidence are explicit.' },
  { id: 'claim_synthesis', purpose: 'Create atomic scoped claims.', input: 'Source assessments', output: 'Draft claim versions', gate: 'Confidence does not exceed evidence.' },
  { id: 'claim_review', purpose: 'Run an independent evidence review.', input: 'Draft claim versions', output: 'Reviewed claim versions', gate: 'Only approved claims continue.' },
  { id: 'knowledge_commit', purpose: 'Version canonical knowledge.', input: 'Approved claim versions', output: 'Persisted ids and audit record', gate: 'Previous versions are preserved.' },
  { id: 'content_brief', purpose: 'Find the strongest truthful angle.', input: 'Approved claims and platform goal', output: 'Content brief', gate: 'Hook preserves claim meaning.' },
  { id: 'platform_draft', purpose: 'Write for the selected platform.', input: 'Content brief', output: 'Traceable draft fragments', gate: 'Every fact links to claim versions.' },
  { id: 'voice_edit', purpose: 'Apply the approved author voice.', input: 'Traceable draft and style profile', output: 'Voice-edited draft', gate: 'No factual meaning or caveat is lost.' },
  { id: 'fact_review', purpose: 'Block unsupported publishable text.', input: 'Voice-edited draft and claims', output: 'Final decision and notes', gate: 'Unsupported factual claim rate is zero.' },
] as const;

export function canPublish(stageDecisions: Partial<Record<PipelineStageId, boolean>>): boolean {
  return FORME_PIPELINE.every((stage) => stageDecisions[stage.id] === true);
}
