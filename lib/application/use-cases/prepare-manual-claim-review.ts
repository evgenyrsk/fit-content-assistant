import type {
  ManualClaimReviewContext, ManualClaimReviewInput, ManualClaimReviewRecord,
} from '../../domain/index.ts';

const keys = [
  'decision', 'reason', 'contradictoryEvidenceNote',
  'provenanceChecked', 'scopeChecked', 'contradictionsChecked',
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function parse(value: unknown): ManualClaimReviewInput {
  if (!record(value) || Object.keys(value).some((key) => !keys.includes(key as typeof keys[number]))) {
    throw new Error('Некорректная структура review.');
  }
  const valid = ['approved', 'rejected'].includes(String(value.decision))
    && text(value.reason, 20, 1000) && text(value.contradictoryEvidenceNote, 20, 1000)
    && typeof value.provenanceChecked === 'boolean' && typeof value.scopeChecked === 'boolean'
    && typeof value.contradictionsChecked === 'boolean';
  if (!valid) throw new Error('Review требует решения и развёрнутого обоснования.');
  return value as unknown as ManualClaimReviewInput;
}

function evidenceSupportsApproval(context: ManualClaimReviewContext): boolean {
  if (!context.evidence.every((item) => item.eligibleForApproval)) return false;
  const kinds = new Set(context.evidence.map((item) => item.kind));
  if (!kinds.has('methods') || (!kinds.has('results') && !kinds.has('discussion'))) return false;
  if (!context.evidence.some((item) => item.direction === 'supporting')) return false;
  const sourceCount = new Set(context.evidence.map((item) => item.sourceId)).size;
  return context.claim.confidence !== 'high' || sourceCount >= 2;
}

function approvalIsSafe(context: ManualClaimReviewContext, input: ManualClaimReviewInput, now: Date): boolean {
  const attested = input.provenanceChecked && input.scopeChecked && input.contradictionsChecked;
  const current = Date.parse(context.claim.reviewDueAt) > now.valueOf();
  return attested && current && evidenceSupportsApproval(context);
}

export function prepareManualClaimReview(
  value: unknown,
  context: ManualClaimReviewContext,
  options: { now?: () => Date; createId?: () => string } = {},
): ManualClaimReviewRecord {
  const input = parse(value);
  if (context.claim.status !== 'needs_review') throw new Error('Эта версия claim уже получила финальное решение.');
  const clock = options.now || (() => new Date());
  if (input.decision === 'approved' && !approvalIsSafe(context, input, clock())) {
    throw new Error('Approval заблокирован: не завершены ручные проверки или evidence недостаточен.');
  }
  return {
    ...input, reason: input.reason.trim(), contradictoryEvidenceNote: input.contradictoryEvidenceNote.trim(),
    id: (options.createId || (() => crypto.randomUUID()))(), claimVersionId: context.claim.id,
    reviewerId: 'owner', createdAt: clock().toISOString(),
  };
}
