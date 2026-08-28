import type { ContentFragment } from '../../domain/index.ts';
import type { PlatformDraftOutput } from './platform-draft-contract.ts';

export interface VoiceEditOutput {
  title: string;
  fragments: ContentFragment[];
  preservedCaveats: string[];
}

const fragmentKeys = ['id', 'text', 'kind', 'claimVersionIds'] as const;
const outputKeys = ['title', 'fragments', 'preservedCaveats'] as const;

export const voiceEditSchema: Record<string, unknown> = {
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
          kind: { type: 'string', enum: ['fact', 'opinion', 'illustration', 'transition', 'cta'] },
          claimVersionIds: {
            type: 'array', maxItems: 8, uniqueItems: true,
            items: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    preservedCaveats: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 500 } },
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

function preservesStructure(fragment: unknown, source: ContentFragment): fragment is ContentFragment {
  if (!record(fragment) || !exact(fragment, fragmentKeys)) return false;
  return fragment.id === source.id && fragment.kind === source.kind
    && typeof fragment.text === 'string' && fragment.text.trim().length > 0
    && sameStrings(fragment.claimVersionIds, source.claimVersionIds);
}

export function validateVoiceEdit(
  value: unknown,
  source: PlatformDraftOutput,
  requiredCaveats: readonly string[],
): VoiceEditOutput {
  if (!record(value) || !exact(value, outputKeys)) throw new Error('Voice edit failed the strict runtime contract.');
  const fragments = value.fragments;
  const valid = typeof value.title === 'string' && value.title.trim().length >= 3
    && Array.isArray(fragments) && fragments.length === source.fragments.length
    && fragments.every((fragment, index) => preservesStructure(fragment, source.fragments[index]))
    && sameStrings(value.preservedCaveats, requiredCaveats);
  if (!valid) throw new Error('Voice edit changed provenance, fragment meaning metadata, or caveats.');
  return value as unknown as VoiceEditOutput;
}
