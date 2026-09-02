import type { SourceReadingBrief } from '../../domain/index.ts';

const pointTypes: SourceReadingBrief['keyPoints'][number]['type'][] = ['main_result', 'method', 'limitation'];

export const sourceReadingBriefSchema = {
  type: 'object', additionalProperties: false,
  required: ['plainLanguageSummary', 'keyPoints', 'conclusionAllowed', 'conclusionNotAllowed'],
  properties: {
    plainLanguageSummary: { type: 'string', minLength: 40, maxLength: 900 },
    keyPoints: {
      type: 'array', minItems: 3, maxItems: 5,
      items: {
        type: 'object', additionalProperties: false,
        required: ['type', 'statement', 'provenanceIds'],
        properties: {
          type: { type: 'string', enum: pointTypes },
          statement: { type: 'string', minLength: 10, maxLength: 400 },
          provenanceIds: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', minLength: 1 } },
        },
      },
    },
    conclusionAllowed: { type: 'string', minLength: 20, maxLength: 500 },
    conclusionNotAllowed: { type: 'string', minLength: 20, maxLength: 500 },
  },
} as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max;
}

export function sourceReadingBriefIsValid(value: unknown): value is SourceReadingBrief {
  if (!record(value) || Object.keys(value).length !== 4 || !text(value.plainLanguageSummary, 40, 900)
    || !text(value.conclusionAllowed, 20, 500) || !text(value.conclusionNotAllowed, 20, 500)
    || !Array.isArray(value.keyPoints) || value.keyPoints.length < 3 || value.keyPoints.length > 5) return false;
  const types = new Set(value.keyPoints.flatMap((point) => record(point) && typeof point.type === 'string' ? [point.type] : []));
  return pointTypes.every((type) => types.has(type)) && value.keyPoints.every((point) => record(point) && Object.keys(point).length === 3
    && pointTypes.includes(point.type as SourceReadingBrief['keyPoints'][number]['type'])
    && text(point.statement, 10, 400) && Array.isArray(point.provenanceIds)
    && point.provenanceIds.length > 0 && point.provenanceIds.length <= 5
    && point.provenanceIds.every((id) => typeof id === 'string' && id.length > 0));
}
