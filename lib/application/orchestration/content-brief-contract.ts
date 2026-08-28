export interface ContentBriefDraft {
  titleAngle: string;
  coreIdea: string;
  tension: string;
  practicalValue: string;
  selectedClaimVersionIds: string[];
}

const keys = ['titleAngle', 'coreIdea', 'tension', 'practicalValue', 'selectedClaimVersionIds'] as const;

export const contentBriefSchema: Record<string, unknown> = {
  type: 'object', additionalProperties: false, required: keys,
  properties: {
    titleAngle: { type: 'string', minLength: 3, maxLength: 180 },
    coreIdea: { type: 'string', minLength: 10, maxLength: 500 },
    tension: { type: 'string', minLength: 3, maxLength: 300 },
    practicalValue: { type: 'string', minLength: 3, maxLength: 400 },
    selectedClaimVersionIds: {
      type: 'array', minItems: 1, maxItems: 8, uniqueItems: true,
      items: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => keys.includes(key as typeof keys[number]));
}

function validTextFields(value: Record<string, unknown>): boolean {
  const fields = [
    [value.titleAngle, 3], [value.coreIdea, 10], [value.tension, 3], [value.practicalValue, 3],
  ] as const;
  return fields.every(([field, length]) => typeof field === 'string' && field.trim().length >= length);
}

function validClaimIds(value: unknown, allowedClaimIds: ReadonlySet<string>): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length) return false;
  return value.every((id) => typeof id === 'string' && allowedClaimIds.has(id));
}

export function validateContentBriefDraft(value: unknown, allowedClaimIds: ReadonlySet<string>): ContentBriefDraft {
  if (!isRecord(value) || !exactKeys(value)) throw new Error('Content brief failed the strict runtime contract.');
  const valid = validTextFields(value) && validClaimIds(value.selectedClaimVersionIds, allowedClaimIds);
  if (!valid) throw new Error('Content brief cited an unavailable claim or invalid field.');
  return value as unknown as ContentBriefDraft;
}
