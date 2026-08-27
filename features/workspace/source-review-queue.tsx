import { Archive, ArrowUpRight, FileCheck2, RefreshCcw, ShieldX } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SourceReviewQueueItem } from '@/lib/domain';
import { intakeReasonText } from './source-intake-presentation';
import { useSourceReviewQueue } from './use-source-review-queue';

type QueueFilter = 'all' | 'full_text' | 'triage' | 'rejected' | 'due';

function matches(item: SourceReviewQueueItem, filter: QueueFilter, now: string): boolean {
  if (filter === 'full_text') return item.contentLevel === 'full_text';
  if (filter === 'triage') return item.intakeDecision === 'admitted_to_triage' && item.contentLevel !== 'full_text';
  if (filter === 'rejected') return item.intakeDecision === 'rejected';
  if (filter === 'due') return Date.parse(item.revalidationDueAt) <= Date.parse(now);
  return true;
}

function contentLabel(item: SourceReviewQueueItem): string {
  if (item.contentLevel === 'full_text') return `Full text · ${item.license ?? 'разрешённая лицензия'}`;
  if (item.intakeDecision === 'rejected') return 'Исключён intake-gate';
  return 'Аннотация · triage';
}

function QueueItem({ item, now }: { item: SourceReviewQueueItem; now: string }) {
  const overdue = Date.parse(item.revalidationDueAt) <= Date.parse(now);
  const state = item.contentLevel === 'full_text' ? 'fulltext' : item.intakeDecision === 'rejected' ? 'rejected' : 'triage';
  return (
    <article className="source-queue-item">
      <span className="source-queue-icon" data-state={state}>
        {state === 'fulltext' ? <FileCheck2 aria-hidden="true" /> : state === 'rejected' ? <ShieldX aria-hidden="true" /> : <Archive aria-hidden="true" />}
      </span>
      <div>
        <small>{item.pmcid ?? item.pmid ?? item.sourceId} · {item.recordStatus}</small>
        <h3>{item.title}</h3>
        <p>{contentLabel(item)} · {intakeReasonText(item.intakeReasons)}</p>
        <em data-overdue={overdue}>{overdue ? 'Пора перепроверить статус' : `Перепроверка до ${new Date(item.revalidationDueAt).toLocaleDateString('ru-RU')}`}</em>
      </div>
      <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Открыть источник: ${item.title}`}><ArrowUpRight aria-hidden="true" /></a>
    </article>
  );
}

export function SourceReviewQueue({ refreshKey }: { refreshKey: string }) {
  const { result, error, loading } = useSourceReviewQueue(refreshKey);
  const [filter, setFilter] = useState<QueueFilter>('all');
  const now = result?.generatedAt ?? new Date().toISOString();
  const sources = useMemo(() => result?.sources ?? [], [result]);
  const filtered = useMemo(() => sources.filter((item) => matches(item, filter, now)), [sources, filter, now]);
  const filters: Array<[QueueFilter, string]> = [
    ['all', `Все ${sources.length}`],
    ['full_text', `Full text ${sources.filter((item) => item.contentLevel === 'full_text').length}`],
    ['triage', `Triage ${sources.filter((item) => item.intakeDecision === 'admitted_to_triage' && item.contentLevel !== 'full_text').length}`],
    ['rejected', `Отсеяно ${sources.filter((item) => item.intakeDecision === 'rejected').length}`],
    ['due', `Перепроверить ${sources.filter((item) => Date.parse(item.revalidationDueAt) <= Date.parse(now)).length}`],
  ];
  return (
    <section className="source-queue-panel">
      <header><div><p className="overline">SOURCE INBOX</p><h2>Очередь источников</h2><p>Отдельно от базы claims. Решения и лицензии остаются проверяемыми.</p></div><RefreshCcw aria-hidden="true" /></header>
      <nav aria-label="Фильтр очереди источников">{filters.map(([value, label]) => <button className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)}>{label}</button>)}</nav>
      <div className="source-queue-list">
        {filtered.map((item) => <QueueItem key={item.sourceId} item={item} now={now} />)}
        {!loading && !error && filtered.length === 0 && <p className="source-queue-empty">В этой категории пока нет источников.</p>}
        {loading && <p className="source-queue-empty">Загружаю сохранённые решения…</p>}
        {error && <p className="source-queue-empty">{error}</p>}
      </div>
    </section>
  );
}
