import type { Confidence, ReviewDecision } from './evidence.ts';

export type PublicLanguageStrength = 'blocked' | 'tentative' | 'qualified' | 'direct';

export interface ClaimPublicationContext {
  confidence: Confidence;
  status: ReviewDecision | 'superseded';
  reviewMode: 'human' | 'automatic';
  methodologyCalibrated: boolean;
}

export interface PublicClaimLanguage {
  strength: PublicLanguageStrength;
  allowedLeadIns: string[];
  requiredCaveat: string;
}

const blocked: PublicClaimLanguage = {
  strength: 'blocked',
  allowedLeadIns: [],
  requiredCaveat: 'Нельзя публиковать как фактическое утверждение.',
};

export function publicClaimLanguage(context: ClaimPublicationContext): PublicClaimLanguage {
  if (context.status !== 'approved') return blocked;
  if (context.reviewMode === 'automatic' && !context.methodologyCalibrated) return blocked;
  if (context.confidence === 'insufficient') return blocked;
  if (context.confidence === 'low') {
    return {
      strength: 'tentative',
      allowedLeadIns: ['ограниченные данные допускают', 'пока можно лишь предположить'],
      requiredCaveat: 'Обязательно назвать главные ограничения и не давать практическую гарантию.',
    };
  }
  if (context.confidence === 'moderate') {
    return {
      strength: 'qualified',
      allowedLeadIns: ['данные в целом указывают', 'вероятно'],
      requiredCaveat: 'Сохранить область применимости и ключевую неопределённость.',
    };
  }
  return {
    strength: 'direct',
    allowedLeadIns: ['совокупность данных показывает', 'можно обоснованно утверждать'],
    requiredCaveat: 'Не расширять вывод за исследованную популяцию, вмешательство и исход.',
  };
}
