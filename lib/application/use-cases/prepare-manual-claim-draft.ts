import type {
  ClaimDraftEvidence, ClaimDraftRecord, Confidence, ManualClaimDraftInput, ManualEvidenceOption,
} from '../../domain/index.ts';

interface PrepareOptions {
  now?: () => Date;
  createId?: () => string;
}

const inputKeys = [
  'topic', 'statement', 'population', 'intervention', 'comparator', 'outcome',
  'timeframe', 'confidence', 'limitations', 'evidence', 'reviewDueAt',
] as const;
const evidenceKeys = ['sourceChunkId', 'direction', 'weight'] as const;
const confidenceValues: Confidence[] = ['high', 'moderate', 'low', 'insufficient'];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function allowedKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function optionalText(value: unknown, max: number): value is string | undefined {
  return value === undefined || value === '' || text(value, 2, max);
}

function evidence(value: unknown): value is ClaimDraftEvidence[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20) return false;
  return value.every((item) => record(item) && allowedKeys(item, evidenceKeys)
    && text(item.sourceChunkId, 1, 160)
    && ['supporting', 'neutral', 'contradicting'].includes(String(item.direction))
    && ['primary', 'secondary', 'context'].includes(String(item.weight)));
}

function limitations(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 8
    && value.every((item) => text(item, 5, 500));
}

function validIdentity(value: Record<string, unknown>): boolean {
  return text(value.topic, 2, 100) && text(value.statement, 15, 700)
    && confidenceValues.includes(value.confidence as Confidence);
}

function validScope(value: Record<string, unknown>): boolean {
  return text(value.population, 2, 240) && text(value.outcome, 2, 240)
    && optionalText(value.intervention, 240) && optionalText(value.comparator, 240)
    && optionalText(value.timeframe, 160);
}

function parse(value: unknown): ManualClaimDraftInput {
  if (!record(value) || !allowedKeys(value, inputKeys)) throw new Error('Некорректная структура claim.');
  const valid = validIdentity(value) && validScope(value)
    && limitations(value.limitations) && evidence(value.evidence)
    && text(value.reviewDueAt, 10, 40);
  if (!valid) throw new Error('Заполните scope, ограничения и evidence в допустимом формате.');
  return value as unknown as ManualClaimDraftInput;
}

function optionalTrim(value: string | undefined): string | null {
  if (value === undefined || value.trim() === '') return null;
  return value.trim();
}

function defaultClock(): Date { return new Date(); }
function defaultId(): string { return crypto.randomUUID(); }

function verifyEvidence(
  selected: ClaimDraftEvidence[],
  options: ManualEvidenceOption[],
  confidence: Confidence,
): void {
  const byId = new Map(options.map((option) => [option.sourceChunkId, option]));
  const linked = selected.map((item) => byId.get(item.sourceChunkId));
  if (new Set(selected.map((item) => item.sourceChunkId)).size !== selected.length || linked.some((item) => !item)) {
    throw new Error('Выбран недоступный или повторяющийся evidence-фрагмент.');
  }
  const kinds = new Set(linked.map((item) => item?.kind));
  if (!kinds.has('methods') || (!kinds.has('results') && !kinds.has('discussion'))) {
    throw new Error('Для claim нужны фрагменты Methods и Results/Discussion.');
  }
  const sourceCount = new Set(linked.map((item) => item?.sourceId)).size;
  if (confidence === 'high' && sourceCount < 2) throw new Error('Высокая уверенность требует минимум два источника.');
}

async function stableKey(input: ManualClaimDraftInput): Promise<string> {
  const scope = [input.population, input.intervention, input.comparator, input.outcome, input.timeframe];
  const bytes = new TextEncoder().encode(`${input.statement.trim().toLowerCase()}|${JSON.stringify(scope)}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function prepareManualClaimDraft(
  value: unknown,
  eligibleEvidence: ManualEvidenceOption[],
  options: PrepareOptions = {},
): Promise<ClaimDraftRecord> {
  const input = parse(value);
  const clock = options.now || defaultClock;
  const now = clock();
  const dueAt = new Date(input.reviewDueAt);
  if (Number.isNaN(dueAt.valueOf()) || dueAt <= now) throw new Error('Дата перепроверки должна быть в будущем.');
  verifyEvidence(input.evidence, eligibleEvidence, input.confidence);
  return {
    id: (options.createId || defaultId)(), stableKey: await stableKey(input),
    topic: input.topic.trim(), statement: input.statement.trim(),
    scope: {
      population: input.population.trim(), intervention: optionalTrim(input.intervention),
      comparator: optionalTrim(input.comparator), outcome: input.outcome.trim(),
      timeframe: optionalTrim(input.timeframe),
    },
    confidence: input.confidence, limitations: input.limitations.map((item) => item.trim()),
    evidence: input.evidence, status: 'needs_review', reviewDueAt: dueAt.toISOString(),
    methodologyVersion: 'manual-owner-review-v1', createdAt: now.toISOString(),
  };
}
