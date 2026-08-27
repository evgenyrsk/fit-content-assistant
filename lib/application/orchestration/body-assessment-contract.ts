import type { BodyCertainty, GradeConcern, GradeDomain, GradeDomainAssessment } from '../../domain/body-certainty.ts';

export interface BodyAssessmentDraft {
  outcomeId: string;
  eligibleStudyAssessmentIds: string[];
  contradictoryStudyAssessmentIds: string[];
  domains: Array<Omit<GradeDomainAssessment, 'assessor'>>;
  initialCertainty: BodyCertainty;
  proposedCertainty: BodyCertainty;
  rationale: string;
}

const certainties: BodyCertainty[] = ['high', 'moderate', 'low', 'very_low', 'insufficient'];
const domains: GradeDomain[] = ['risk_of_bias', 'inconsistency', 'indirectness', 'imprecision', 'publication_bias'];
const concerns: GradeConcern[] = ['not_serious', 'serious', 'very_serious', 'unable_to_assess'];
const bodyKeys = [
  'outcomeId', 'eligibleStudyAssessmentIds', 'contradictoryStudyAssessmentIds',
  'domains', 'initialCertainty', 'proposedCertainty', 'rationale',
] as const;

export const bodyAssessmentSchema: Record<string, unknown> = {
  type: 'object', additionalProperties: false, required: bodyKeys,
  properties: {
    outcomeId: { type: 'string', minLength: 1, maxLength: 200 },
    eligibleStudyAssessmentIds: { type: 'array', minItems: 1, maxItems: 30, items: { type: 'string', minLength: 1 } },
    contradictoryStudyAssessmentIds: { type: 'array', maxItems: 30, items: { type: 'string', minLength: 1 } },
    domains: {
      type: 'array', minItems: 5, maxItems: 5,
      items: {
        type: 'object', additionalProperties: false,
        required: ['domain', 'concern', 'rationale', 'supportingAssessmentIds'],
        properties: {
          domain: { type: 'string', enum: domains }, concern: { type: 'string', enum: concerns },
          rationale: { type: 'string', minLength: 3, maxLength: 800 },
          supportingAssessmentIds: { type: 'array', minItems: 1, maxItems: 30, items: { type: 'string', minLength: 1 } },
        },
      },
    },
    initialCertainty: { type: 'string', enum: certainties },
    proposedCertainty: { type: 'string', enum: certainties },
    rationale: { type: 'string', minLength: 3, maxLength: 1200 },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringIds(value: unknown, allowEmpty = false): value is string[] {
  return Array.isArray(value) && (allowEmpty || value.length > 0)
    && value.every((item) => typeof item === 'string' && item.length > 0);
}

function domainRowsAreValid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== domains.length) return false;
  const present = new Set(value.flatMap((row) => isRecord(row) && typeof row.domain === 'string' ? [row.domain] : []));
  return domains.every((domain) => present.has(domain)) && value.every((row) => isRecord(row)
    && Object.keys(row).length === 4 && concerns.includes(row.concern as GradeConcern)
    && typeof row.rationale === 'string' && row.rationale.length >= 3
    && stringIds(row.supportingAssessmentIds));
}

export function validateBodyAssessmentDraft(value: unknown): BodyAssessmentDraft {
  if (!isRecord(value)) throw new Error('Body assessment must be an object.');
  const exact = Object.keys(value).length === bodyKeys.length
    && Object.keys(value).every((key) => bodyKeys.includes(key as typeof bodyKeys[number]));
  const valid = [
    exact, typeof value.outcomeId === 'string', stringIds(value.eligibleStudyAssessmentIds),
    stringIds(value.contradictoryStudyAssessmentIds, true), domainRowsAreValid(value.domains),
    certainties.includes(value.initialCertainty as BodyCertainty),
    certainties.includes(value.proposedCertainty as BodyCertainty),
    typeof value.rationale === 'string' && value.rationale.length >= 3,
  ].every(Boolean);
  if (!valid) throw new Error('Body assessment failed the strict runtime contract.');
  return value as unknown as BodyAssessmentDraft;
}
