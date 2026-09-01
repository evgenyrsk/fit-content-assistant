import type { BodyCertainty, GradeConcern, GradeDomain, StudyGateDecision, StudyGateReason } from '@/lib/domain';

export const studyDecisionLabels: Record<StudyGateDecision, string> = {
  excluded: 'исключён', context_only: 'только контекст', needs_human_review: 'нужна проверка', eligible_for_synthesis: 'допущен к синтезу',
};

export const studyReasonLabels: Record<StudyGateReason, string> = {
  retracted_record: 'публикация отозвана', target_outcome_not_measured: 'целевой исход не измерен',
  identity_or_version_unverified: 'версия не подтверждена', expression_of_concern: 'есть expression of concern',
  incomplete_provenance: 'неполная трассировка', incomplete_dimension_set: 'не все измерения оценены',
  critical_bias_concern: 'критический риск bias', high_bias_concern: 'высокий риск bias',
  sponsor_role_unclear: 'роль спонсора неясна', question_design_mismatch: 'дизайн не соответствует вопросу',
  design_checks_incomplete: 'неполная проверка дизайна', design_checks_unclear: 'проверки дизайна неясны',
  registration_or_protocol_concern: 'проблема регистрации или протокола', selective_reporting_concern: 'риск выборочного отчёта',
  randomization_concern: 'проблема рандомизации', measurement_bias_concern: 'риск ошибки измерения',
  attrition_concern: 'проблема выбывания', multiplicity_concern: 'риск множественных сравнений',
  confounding_or_temporality_concern: 'confounding или temporality', imprecision_concern: 'неточность результата',
  review_methods_concern: 'ограничения методов обзора', sponsor_independence_concern: 'независимость от спонсора неясна',
  eligible_with_recorded_caveats: 'допущен с оговорками',
};

export const domainLabels: Record<GradeDomain, string> = {
  risk_of_bias: 'Risk of bias', inconsistency: 'Согласованность', indirectness: 'Прямота',
  imprecision: 'Точность', publication_bias: 'Publication bias',
};

export const concernLabels: Record<GradeConcern, string> = {
  not_serious: 'без серьёзных проблем', serious: 'серьёзное ограничение',
  very_serious: 'очень серьёзное', unable_to_assess: 'нельзя оценить',
};

export const certaintyLabels: Record<BodyCertainty, string> = {
  high: 'высокая', moderate: 'умеренная', low: 'низкая', very_low: 'очень низкая', insufficient: 'недостаточно данных',
};
