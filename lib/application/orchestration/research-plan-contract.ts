import type { EvidenceQuestionType } from '../../domain/evidence-methodology.ts';
import type { ResearchPlanDraft } from '../../domain/research.ts';

export type { ResearchPlanDraft } from '../../domain/research.ts';

const questionTypes: EvidenceQuestionType[] = [
  'intervention_effect', 'exposure_association', 'prognosis',
  'diagnostic_accuracy', 'systematic_review', 'mechanistic_context',
];

const planKeys = [
  'normalizedQuestion', 'questionType', 'population', 'intervention', 'comparator',
  'outcomes', 'inclusionCriteria', 'exclusionCriteria', 'disconfirmingEvidence',
  'searchQuery', 'ambiguities',
] as const;

export const researchPlanSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'normalizedQuestion', 'questionType', 'population', 'intervention', 'comparator',
    'outcomes', 'inclusionCriteria', 'exclusionCriteria', 'disconfirmingEvidence',
    'searchQuery', 'ambiguities',
  ],
  properties: {
    normalizedQuestion: { type: 'string', minLength: 3, maxLength: 500 },
    questionType: { type: 'string', enum: questionTypes },
    population: { type: 'string', minLength: 1, maxLength: 300 },
    intervention: { type: ['string', 'null'], maxLength: 300 },
    comparator: { type: ['string', 'null'], maxLength: 300 },
    outcomes: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 200 } },
    inclusionCriteria: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'string', minLength: 1, maxLength: 300 } },
    exclusionCriteria: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'string', minLength: 1, maxLength: 300 } },
    disconfirmingEvidence: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 300 } },
    searchQuery: { type: 'string', minLength: 3, maxLength: 800 },
    ambiguities: { type: 'array', maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 300 } },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown, minimum = 1): value is string {
  return typeof value === 'string' && value.trim().length >= minimum;
}

function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isTextList(value: unknown, allowEmpty = false): value is string[] {
  return Array.isArray(value) && (allowEmpty || value.length > 0) && value.every((item) => isText(item));
}

const fieldValidators: Record<keyof ResearchPlanDraft, (value: unknown) => boolean> = {
  normalizedQuestion: (value) => isText(value, 3),
  questionType: (value) => questionTypes.includes(value as EvidenceQuestionType),
  population: (value) => isText(value),
  intervention: isOptionalText,
  comparator: isOptionalText,
  outcomes: (value) => isTextList(value),
  inclusionCriteria: (value) => isTextList(value),
  exclusionCriteria: (value) => isTextList(value),
  disconfirmingEvidence: (value) => isTextList(value),
  searchQuery: (value) => isText(value, 3),
  ambiguities: (value) => isTextList(value, true),
};

export function validateResearchPlan(value: unknown): ResearchPlanDraft {
  if (!isRecord(value)) throw new Error('Research plan must be an object.');
  const hasExactKeys = Object.keys(value).length === planKeys.length
    && Object.keys(value).every((key) => planKeys.includes(key as typeof planKeys[number]));
  const valid = hasExactKeys && planKeys.every((key) => fieldValidators[key](value[key]));
  if (!valid) throw new Error('Research plan failed the strict runtime contract.');
  return value as unknown as ResearchPlanDraft;
}
