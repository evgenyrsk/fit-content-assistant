import type { Confidence, KnowledgeClaimRecord } from '@/lib/domain';

export const confidenceLabels: Record<Confidence, string> = {
  high: 'Высокая', moderate: 'Умеренная', low: 'Низкая', insufficient: 'Недостаточно данных',
};

export const statusLabels: Record<KnowledgeClaimRecord['status'], string> = {
  approved: 'подтверждено', needs_review: 'нужна проверка',
  rejected: 'отклонено', superseded: 'заменено',
};

export function confidenceTone(confidence: Confidence): 'high' | 'moderate' | 'limited' {
  if (confidence === 'high') return 'high';
  if (confidence === 'moderate') return 'moderate';
  return 'limited';
}

export function confidenceMarker(confidence: Confidence): string {
  if (confidence === 'high') return 'A';
  if (confidence === 'moderate') return 'B';
  if (confidence === 'low') return 'C';
  return 'D';
}

export function evidenceLabel(claim: KnowledgeClaimRecord): string {
  const sources = claim.sourceTypes.length > 0 ? claim.sourceTypes.join(', ') : 'источники не привязаны';
  return `${claim.evidenceCount} фрагм. evidence · ${sources}`;
}
