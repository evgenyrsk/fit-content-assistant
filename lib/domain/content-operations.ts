import type { ContentFormat, ContentFragment } from './content.ts';

export type EditorialStatus = 'draft' | 'fact_check' | 'ready' | 'scheduled' | 'published' | 'archived';

export interface ContentOperation {
  editorialStatus: EditorialStatus;
  scheduledFor?: string;
  publishedAt?: string;
  publicationUrl?: string;
  updatedAt: string;
}

export interface ManualContentInput {
  itemId?: string;
  format: ContentFormat;
  title: string;
  text: string;
  fragmentKind: ContentFragment['kind'];
  claimVersionIds: string[];
  changeNote: string;
}

export interface ContentReviewInput {
  contentItemId: string;
  decision: 'approved' | 'rejected';
  traceChecked: boolean;
  caveatsChecked: boolean;
  platformFitChecked: boolean;
  notes: string;
}

export interface ContentOperationInput {
  contentItemId: string;
  editorialStatus: EditorialStatus;
  scheduledFor?: string;
  publicationUrl?: string;
}

const transitions: Record<EditorialStatus, readonly EditorialStatus[]> = {
  draft: ['fact_check', 'archived'],
  fact_check: ['draft', 'ready', 'archived'],
  ready: ['draft', 'scheduled', 'archived'],
  scheduled: ['ready', 'published', 'archived'],
  published: ['archived'],
  archived: ['draft'],
};

export function validateManualContent(input: ManualContentInput): string[] {
  const errors: string[] = [];
  if (input.title.trim().length < 4) errors.push('Название должно содержать не менее 4 символов.');
  if (input.text.trim().length < 20) errors.push('Текст должен содержать не менее 20 символов.');
  if (input.fragmentKind === 'fact' && input.claimVersionIds.length === 0) {
    errors.push('Фактический текст требует хотя бы один свежий approved claim.');
  }
  if (input.fragmentKind !== 'fact' && input.claimVersionIds.length > 0) {
    errors.push('Claim-связи допустимы только для фактического фрагмента.');
  }
  return errors;
}

export function validateContentReview(input: ContentReviewInput): string[] {
  if (input.decision === 'rejected') return input.notes.trim() ? [] : ['Укажите причину возврата.'];
  const errors: string[] = [];
  if (!input.traceChecked) errors.push('Проверьте claim-трассировку.');
  if (!input.caveatsChecked) errors.push('Проверьте сохранность оговорок.');
  if (!input.platformFitChecked) errors.push('Проверьте соответствие формату платформы.');
  return errors;
}

export function validateEditorialTransition(
  current: EditorialStatus,
  input: ContentOperationInput,
  gateStatus: 'ready_for_human_review' | 'needs_review',
  now: Date,
): string[] {
  const errors: string[] = [];
  if (!transitionAllowed(current, input.editorialStatus)) {
    errors.push(`Переход ${current} → ${input.editorialStatus} не разрешён.`);
  }
  if (gateBlocked(input.editorialStatus, gateStatus)) errors.push('Сначала нужен подтверждённый human fact-check.');
  if (invalidSchedule(input, now)) errors.push('Для планирования нужна будущая дата публикации.');
  if (missingPublicationUrl(input)) errors.push('Для публикации укажите ссылку на материал.');
  return errors;
}

function transitionAllowed(current: EditorialStatus, next: EditorialStatus): boolean {
  return current === next || transitions[current].includes(next);
}

function gateBlocked(status: EditorialStatus, gate: 'ready_for_human_review' | 'needs_review'): boolean {
  return ['ready', 'scheduled', 'published'].includes(status) && gate !== 'ready_for_human_review';
}

function invalidSchedule(input: ContentOperationInput, now: Date): boolean {
  if (input.editorialStatus !== 'scheduled') return false;
  if (!input.scheduledFor) return true;
  const scheduled = new Date(input.scheduledFor);
  return Number.isNaN(scheduled.valueOf()) || scheduled <= now;
}

function missingPublicationUrl(input: ContentOperationInput): boolean {
  return input.editorialStatus === 'published' && !input.publicationUrl?.trim();
}
