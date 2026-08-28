import type { ContentFragment } from '../../domain/index.ts';

export interface PlatformDraftOutput {
  title: string;
  fragments: ContentFragment[];
  coveredCaveats: string[];
}

const fragmentKeys = ['id', 'text', 'kind', 'claimVersionIds'] as const;
const outputKeys = ['title', 'fragments', 'coveredCaveats'] as const;
const fragmentKinds = ['fact', 'opinion', 'illustration', 'transition', 'cta'] as const;

export const platformDraftSchema: Record<string, unknown> = {
  type: 'object', additionalProperties: false, required: outputKeys,
  properties: {
    title: { type: 'string', minLength: 3, maxLength: 180 },
    fragments: {
      type: 'array', minItems: 1, maxItems: 30,
      items: {
        type: 'object', additionalProperties: false, required: fragmentKeys,
        properties: {
          id: { type: 'string', minLength: 1, maxLength: 80 },
          text: { type: 'string', minLength: 1, maxLength: 1200 },
          kind: { type: 'string', enum: fragmentKinds },
          claimVersionIds: {
            type: 'array', maxItems: 8, uniqueItems: true,
            items: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    coveredCaveats: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 500 } },
  },
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function validClaimLinks(value: unknown, kind: string, allowedClaimIds: ReadonlySet<string>): value is string[] {
  if (!Array.isArray(value) || new Set(value).size !== value.length) return false;
  if (!value.every((id) => typeof id === 'string' && allowedClaimIds.has(id))) return false;
  return kind !== 'fact' || value.length > 0;
}

function validFragment(value: unknown, allowedClaimIds: ReadonlySet<string>): value is ContentFragment {
  if (!record(value) || !exact(value, fragmentKeys)) return false;
  const kind = String(value.kind);
  return typeof value.id === 'string' && typeof value.text === 'string' && value.text.trim().length > 0
    && fragmentKinds.includes(kind as ContentFragment['kind'])
    && validClaimLinks(value.claimVersionIds, kind, allowedClaimIds);
}

function sameStrings(actual: unknown, expected: readonly string[]): actual is string[] {
  return Array.isArray(actual) && actual.length === expected.length
    && actual.every((item) => typeof item === 'string' && expected.includes(item));
}

export function validatePlatformDraft(
  value: unknown,
  allowedClaimIds: ReadonlySet<string>,
  requiredCaveats: readonly string[],
): PlatformDraftOutput {
  if (!record(value) || !exact(value, outputKeys)) throw new Error('Platform draft failed the strict runtime contract.');
  const fragments = value.fragments;
  const valid = typeof value.title === 'string' && value.title.trim().length >= 3
    && Array.isArray(fragments) && fragments.length > 0
    && fragments.every((fragment) => validFragment(fragment, allowedClaimIds))
    && new Set(fragments.map((fragment) => record(fragment) ? fragment.id : '')).size === fragments.length
    && sameStrings(value.coveredCaveats, requiredCaveats);
  if (!valid) throw new Error('Platform draft lost provenance or a required caveat.');
  return value as unknown as PlatformDraftOutput;
}
