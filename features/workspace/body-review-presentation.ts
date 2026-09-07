import type { BodyAssessmentHumanReview, BodyAssessmentRecord } from '@/lib/domain';

export function savedBodyReviewMessage(review: BodyAssessmentHumanReview): string {
  if (review.decision === 'confirmed') {
    return 'Можно подготовить claim draft; публикация и статус знания останутся закрыты до отдельного claim review.';
  }
  if (review.decision === 'rejected') {
    return 'Claim draft закрыт: совокупность данных отклонена человеком.';
  }
  return 'Claim draft закрыт до получения и проверки недостающей информации.';
}

export function claimDraftActionMessage(body: BodyAssessmentRecord): string {
  const publicationBiasUnknown = body.assessment.domains.some((domain) => (
    domain.domain === 'publication_bias' && domain.concern === 'unable_to_assess'
  ));
  return publicationBiasUnknown
    ? 'Можно подготовить узкий тезис. Неопределённость publication bias снизит уверенность и останется в ограничениях.'
    : 'Можно подготовить узкий тезис с точными evidence links. Это ещё не знание и не контент.';
}
