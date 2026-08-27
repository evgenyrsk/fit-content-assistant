import { Bot, Route, ShieldAlert } from 'lucide-react';
import type { ResearchPlanningTrace } from '@/lib/domain';

const labels = {
  model_draft: ['LLM-план · черновик', 'Модель сформировала проверяемый план поиска. Он сохранён и требует проверки.'],
  deterministic_fallback: ['Защитный fallback', 'Ответ модели не прошёл строгий контракт. Поиск выполнен по безопасному базовому запросу.'],
  awaiting_provider: ['LLM ожидает подключения', 'Пока используется детерминированный научный поиск; модельный этап включится после добавления серверного ключа.'],
} as const;

export function ResearchPipelineTrace({ planning }: { planning: ResearchPlanningTrace }) {
  const [title, copy] = labels[planning.mode];
  return (
    <div className={`research-trace ${planning.mode}`}>
      <span><Bot aria-hidden="true" /></span>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
        <small><Route aria-hidden="true" /> Запрос к источникам: {planning.searchQuery}</small>
      </div>
      <em><ShieldAlert aria-hidden="true" /> Claims не утверждаются автоматически</em>
    </div>
  );
}
