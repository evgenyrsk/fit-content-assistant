import type { SourceIntakeDecision, SourceIntakeReason } from '@/lib/domain';

const reasonLabels: Record<SourceIntakeReason, string> = {
  eligible_abstract: 'аннотация прошла pre-screen',
  corrected_record_requires_review: 'есть исправление — нужна проверка',
  record_retracted: 'публикация отозвана',
  record_expression_of_concern: 'есть expression of concern',
  record_identity_unverified: 'не подтверждён PMID',
  abstract_missing: 'нет аннотации',
  abstract_too_short: 'недостаточно данных в аннотации',
  non_research_publication: 'не исследовательский тип публикации',
};

export function intakeReasonText(reasons: SourceIntakeReason[]): string {
  return reasons.map((reason) => reasonLabels[reason]).join(' · ');
}

export function intakePresentation(decision?: SourceIntakeDecision, fullTextLicense?: string): {
  label: string;
  details: string;
  state: 'fulltext' | 'admitted' | 'rejected' | 'candidate';
} {
  if (fullTextLicense) {
    return {
      label: 'Полный текст PMC',
      details: `${fullTextLicense} · секции сохранены с provenance`,
      state: 'fulltext',
    };
  }
  if (!decision) {
    return { label: 'Кандидат', details: 'Сохранён только в истории поиска', state: 'candidate' };
  }
  const details = intakeReasonText(decision.reasons);
  return decision.decision === 'admitted_to_triage'
    ? { label: 'Допущен в triage', details, state: 'admitted' }
    : { label: 'Отсеян', details, state: 'rejected' };
}
