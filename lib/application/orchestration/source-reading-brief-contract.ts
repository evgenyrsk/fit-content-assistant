import type { SourceReadingBrief } from '../../domain/index.ts';

const pointTypes: SourceReadingBrief['keyPoints'][number]['type'][] = ['main_result', 'method', 'limitation'];
const unavailable = 'Не указано в доступном тексте.';

export const sourceReadingBriefSchema = {
  type: 'object', additionalProperties: false,
  required: ['plainLanguageSummary', 'studySnapshot', 'keyPoints', 'conclusionAllowed', 'conclusionNotAllowed'],
  properties: {
    plainLanguageSummary: { type: 'string', minLength: 40, maxLength: 900 },
    studySnapshot: {
      type: 'object', additionalProperties: false, required: ['population', 'sampleSize', 'groups'],
      properties: {
        population: snapshotFieldSchema(), sampleSize: snapshotFieldSchema(), groups: snapshotFieldSchema(),
      },
    },
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

function snapshotFieldSchema() {
  return {
    type: 'object', additionalProperties: false, required: ['value', 'reported', 'provenanceIds'],
    properties: {
      value: { type: 'string', minLength: 3, maxLength: 500 }, reported: { type: 'boolean' },
      provenanceIds: { type: 'array', minItems: 0, maxItems: 5, items: { type: 'string', minLength: 1 } },
    },
  } as const;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.length <= max;
}

function snapshotFieldIsValid(value: unknown): boolean {
  if (!record(value) || Object.keys(value).length !== 3 || !text(value.value, 3, 500)
    || typeof value.reported !== 'boolean' || !Array.isArray(value.provenanceIds)
    || value.provenanceIds.length > 5 || !value.provenanceIds.every((id) => typeof id === 'string' && id.length > 0)) return false;
  return value.reported ? value.provenanceIds.length > 0 : value.value === unavailable && value.provenanceIds.length === 0;
}

function snapshotIsValid(value: unknown): boolean {
  if (!record(value) || Object.keys(value).length !== 3) return false;
  return ['population', 'sampleSize', 'groups'].every((key) => snapshotFieldIsValid(value[key]));
}

function briefShapeIsValid(value: unknown): value is Record<string, unknown> {
  return record(value) && Object.keys(value).length === 5 && text(value.plainLanguageSummary, 40, 900)
    && text(value.conclusionAllowed, 20, 500) && text(value.conclusionNotAllowed, 20, 500)
    && snapshotIsValid(value.studySnapshot) && Array.isArray(value.keyPoints)
    && value.keyPoints.length >= 3 && value.keyPoints.length <= 5;
}

function keyPointsAreValid(points: unknown[]): boolean {
  const types = new Set(points.flatMap((point) => record(point) && typeof point.type === 'string' ? [point.type] : []));
  return pointTypes.every((type) => types.has(type)) && points.every((point) => record(point) && Object.keys(point).length === 3
    && pointTypes.includes(point.type as SourceReadingBrief['keyPoints'][number]['type'])
    && text(point.statement, 10, 400) && Array.isArray(point.provenanceIds)
    && point.provenanceIds.length > 0 && point.provenanceIds.length <= 5
    && point.provenanceIds.every((id) => typeof id === 'string' && id.length > 0));
}

export function sourceReadingBriefIsValid(value: unknown): value is SourceReadingBrief {
  if (!briefShapeIsValid(value)) return false;
  const points = value.keyPoints as unknown[];
  return keyPointsAreValid(points);
}
