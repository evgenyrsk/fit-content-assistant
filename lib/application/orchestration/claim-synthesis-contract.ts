import type { Confidence } from '../../domain/evidence.ts';

export interface ClaimSynthesisDraft {
  topic: string;
  statement: string;
  scope: {
    population: string;
    intervention: string | null;
    comparator: string | null;
    outcome: string;
    timeframe: string | null;
  };
  confidence: Confidence;
  limitations: string[];
  evidence: Array<{
    sourceAssessmentId: string;
    sourceChunkId: string;
    direction: 'supporting' | 'neutral' | 'contradicting';
    weight: 'primary' | 'secondary' | 'context';
  }>;
  reviewDueAt: string;
}

const claimKeys = ['topic', 'statement', 'scope', 'confidence', 'limitations', 'evidence', 'reviewDueAt'] as const;
const scopeKeys = ['population', 'intervention', 'comparator', 'outcome', 'timeframe'] as const;

export const claimSynthesisSchema: Record<string, unknown> = {
  type: 'object', additionalProperties: false, required: claimKeys,
  properties: {
    topic: { type: 'string', minLength: 1, maxLength: 100 },
    statement: { type: 'string', minLength: 10, maxLength: 700 },
    scope: {
      type: 'object', additionalProperties: false, required: scopeKeys,
      properties: {
        population: { type: 'string', minLength: 1, maxLength: 300 },
        intervention: { type: ['string', 'null'], maxLength: 300 },
        comparator: { type: ['string', 'null'], maxLength: 300 },
        outcome: { type: 'string', minLength: 1, maxLength: 300 },
        timeframe: { type: ['string', 'null'], maxLength: 300 },
      },
    },
    confidence: { type: 'string', enum: ['high', 'moderate', 'low', 'insufficient'] },
    limitations: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'string', minLength: 3, maxLength: 500 } },
    evidence: {
      type: 'array', minItems: 1, maxItems: 50,
      items: {
        type: 'object', additionalProperties: false,
        required: ['sourceAssessmentId', 'sourceChunkId', 'direction', 'weight'],
        properties: {
          sourceAssessmentId: { type: 'string', minLength: 1 }, sourceChunkId: { type: 'string', minLength: 1 },
          direction: { type: 'string', enum: ['supporting', 'neutral', 'contradicting'] },
          weight: { type: 'string', enum: ['primary', 'secondary', 'context'] },
        },
      },
    },
    reviewDueAt: { type: 'string', minLength: 10, maxLength: 40 },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0
    && value.every((item) => typeof item === 'string' && item.trim().length >= 3);
}

function evidenceIsValid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((item) => isRecord(item) && exactKeys(item, ['sourceAssessmentId', 'sourceChunkId', 'direction', 'weight'])
    && typeof item.sourceAssessmentId === 'string' && typeof item.sourceChunkId === 'string'
    && ['supporting', 'neutral', 'contradicting'].includes(String(item.direction))
    && ['primary', 'secondary', 'context'].includes(String(item.weight)));
}

function scopeIsValid(value: unknown): boolean {
  if (!isRecord(value) || !exactKeys(value, scopeKeys)) return false;
  return typeof value.population === 'string' && typeof value.outcome === 'string'
    && (value.intervention === null || typeof value.intervention === 'string')
    && (value.comparator === null || typeof value.comparator === 'string')
    && (value.timeframe === null || typeof value.timeframe === 'string');
}

export function validateClaimSynthesisDraft(value: unknown): ClaimSynthesisDraft {
  if (!isRecord(value)) throw new Error('Claim synthesis must be an object.');
  const valid = [
    exactKeys(value, claimKeys), typeof value.topic === 'string',
    typeof value.statement === 'string' && value.statement.length >= 10,
    scopeIsValid(value.scope), ['high', 'moderate', 'low', 'insufficient'].includes(String(value.confidence)),
    stringList(value.limitations), evidenceIsValid(value.evidence),
    typeof value.reviewDueAt === 'string' && Number.isFinite(Date.parse(value.reviewDueAt)),
  ].every(Boolean);
  if (!valid) throw new Error('Claim synthesis failed the strict runtime contract.');
  return value as unknown as ClaimSynthesisDraft;
}
