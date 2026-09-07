import type {
  ClaimDraftPreparationGate, ClaimSynthesisResponse,
} from '../../../../../lib/domain/index.ts';

export function emptyClaimSynthesisResponse(
  status: ClaimSynthesisResponse['status'],
  warning: string,
  gate?: ClaimDraftPreparationGate,
): ClaimSynthesisResponse {
  return { status, reviewRequired: true, claim: null, saved: null, gate, warning };
}

export function claimDraftFailureWarning(gate: ClaimDraftPreparationGate): string {
  if (gate.blockingReasons.includes('human_confirmation_required')) {
    return 'Claim draft закрыт до отдельного человеческого подтверждения body assessment.';
  }
  if (gate.blockingReasons.some((reason) => [
    'source_hard_stop', 'source_confirmation_required', 'source_provenance_missing',
  ].includes(reason))) {
    return 'Claim draft закрыт: проверьте допуск источников, human review и точную provenance.';
  }
  if (gate.decision === 'blocked') {
    return 'Claim draft закрыт: body assessment не прошёл обязательные структурные проверки.';
  }
  return 'Claim draft не создан: модельный ответ не прошёл строгий контракт или evidence links невалидны.';
}
