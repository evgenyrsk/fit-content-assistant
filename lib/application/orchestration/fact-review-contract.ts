import type { ReviewDecision } from '../../domain/index.ts';
import type { VoiceEditOutput } from './voice-edit-contract.ts';

interface FragmentReview {
  fragmentId: string;
  decision: ReviewDecision;
  claimVersionIds: string[];
  reasons: string[];
}

export interface FactReviewOutput {
  decision: ReviewDecision;
  fragmentReviews: FragmentReview[];
  preservedCaveats: string[];
  unsupportedFragmentIds: string[];
  notes: string[];
}

const reviewKeys = ['fragmentId', 'decision', 'claimVersionIds', 'reasons'] as const;
const outputKeys = ['decision', 'fragmentReviews', 'preservedCaveats', 'unsupportedFragmentIds', 'notes'] as const;

export const factReviewSchema: Record<string, unknown> = {
  type: 'object', additionalProperties: false, required: outputKeys,
  properties: {
    decision: { type: 'string', enum: ['approved', 'needs_review', 'rejected'] },
    fragmentReviews: {
      type: 'array', minItems: 1, maxItems: 30,
      items: {
        type: 'object', additionalProperties: false, required: reviewKeys,
        properties: {
          fragmentId: { type: 'string', minLength: 1, maxLength: 80 },
          decision: { type: 'string', enum: ['approved', 'needs_review', 'rejected'] },
          claimVersionIds: { type: 'array', maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 100 } },
          reasons: { type: 'array', maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 500 } },
        },
      },
    },
    preservedCaveats: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 500 } },
    unsupportedFragmentIds: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 80 } },
    notes: { type: 'array', maxItems: 12, items: { type: 'string', minLength: 1, maxLength: 500 } },
  },
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function sameStrings(actual: unknown, expected: readonly string[]): actual is string[] {
  return Array.isArray(actual) && actual.length === expected.length
    && actual.every((item) => typeof item === 'string' && expected.includes(item));
}

function validReview(value: unknown, source: VoiceEditOutput): value is FragmentReview {
  if (!record(value) || !exact(value, reviewKeys)) return false;
  const fragment = source.fragments.find((item) => item.id === value.fragmentId);
  return Boolean(fragment) && ['approved', 'needs_review', 'rejected'].includes(String(value.decision))
    && sameStrings(value.claimVersionIds, fragment?.claimVersionIds ?? [])
    && Array.isArray(value.reasons) && value.reasons.every((reason) => typeof reason === 'string');
}

function approvedReviewIsSafe(value: Record<string, unknown>, reviews: FragmentReview[]): boolean {
  if (value.decision !== 'approved') return true;
  return reviews.every((review) => review.decision === 'approved')
    && Array.isArray(value.unsupportedFragmentIds) && value.unsupportedFragmentIds.length === 0;
}

function validReviewCoverage(value: unknown, source: VoiceEditOutput): value is FragmentReview[] {
  if (!Array.isArray(value) || value.length !== source.fragments.length) return false;
  if (!value.every((review) => validReview(review, source))) return false;
  return new Set(value.map((review) => record(review) ? review.fragmentId : '')).size === value.length;
}

function validUnsupported(value: unknown, fragmentIds: ReadonlySet<string>): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string' && fragmentIds.has(id));
}

function validNotes(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((note) => typeof note === 'string');
}

export function validateFactReview(
  value: unknown,
  source: VoiceEditOutput,
  requiredCaveats: readonly string[],
): FactReviewOutput {
  if (!record(value) || !exact(value, outputKeys)) throw new Error('Fact review failed the strict runtime contract.');
  const fragmentIds = new Set(source.fragments.map((fragment) => fragment.id));
  const reviews = value.fragmentReviews;
  const valid = ['approved', 'needs_review', 'rejected'].includes(String(value.decision))
    && validReviewCoverage(reviews, source)
    && sameStrings(value.preservedCaveats, requiredCaveats)
    && validUnsupported(value.unsupportedFragmentIds, fragmentIds)
    && validNotes(value.notes)
    && approvedReviewIsSafe(value, reviews);
  if (!valid) throw new Error('Fact review did not cover every fragment or approved unsupported text.');
  return value as unknown as FactReviewOutput;
}
