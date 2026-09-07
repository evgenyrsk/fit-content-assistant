import type { OperationsHealth } from '@/lib/domain';

export interface OperationsHealthPresentation {
  state: 'checking' | 'healthy' | 'attention_required';
  title: string;
  detail: string;
  facts: string[];
}

export function operationsHealthPresentation(
  health: OperationsHealth | null,
  loading: boolean,
): OperationsHealthPresentation {
  if (loading && !health) return {
    state: 'checking',
    title: 'Проверяю production-контур',
    detail: 'Сверяю запуски моделей, аудит и актуальность источников.',
    facts: [],
  };
  if (!health) return {
    state: 'attention_required',
    title: 'Операционный статус недоступен',
    detail: 'Evidence-gates продолжают работать, но диагностика требует проверки.',
    facts: [],
  };
  return {
    state: health.status,
    title: health.status === 'healthy' ? 'Production-контур в норме' : 'Нужна операционная проверка',
    detail: health.status === 'healthy'
      ? 'За последние 24 часа незавершённых model runs и просроченных источников не обнаружено.'
      : `Незавершённые model runs: ${health.incompleteModelRuns24h}. Источники к переоценке: ${health.dueSourceRevalidations}.`,
    facts: [
      `Model runs · ${health.modelRuns24h}`,
      `LLM cost · $${health.modelCostUsd24h.toFixed(4)}`,
      `Переоценка источников · ${health.dueSourceRevalidations}`,
      `SLO · ${health.objectives.availabilityTarget}`,
    ],
  };
}
