import { Archive, ArrowUpRight, FileCheck2, FileUp, RefreshCcw, ShieldX } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SourceReviewQueueItem } from '@/lib/domain';
import { intakeReasonText } from './source-intake-presentation';
import { SourcePdfImport } from './source-pdf-import';
import { useSourceReviewQueue } from './use-source-review-queue';

type QueueFilter = 'all' | 'manual' | 'full_text' | 'triage' | 'rejected' | 'due';

const rightsLabels = {
  open_access: 'открытый доступ',
  author_copy: 'копия от автора',
  institutional_access: 'институциональный доступ',
  purchased_copy: 'приобретённая копия',
  other_lawful_access: 'другой законный доступ',
} as const;

function matches(item: SourceReviewQueueItem, filter: QueueFilter, now: string): boolean {
  if (filter === 'full_text') return item.contentLevel === 'full_text';
  if (filter === 'manual') return Boolean(item.manualUpload);
  if (filter === 'triage') return item.intakeDecision === 'admitted_to_triage' && item.contentLevel !== 'full_text';
  if (filter === 'rejected') return item.intakeDecision === 'rejected';
  if (filter === 'due') return Date.parse(item.revalidationDueAt) <= Date.parse(now);
  return true;
}

function contentLabel(item: SourceReviewQueueItem): string {
  if (item.manualUpload) {
    if (item.manualUpload.processingStatus === 'ready_for_triage') return 'PDF пользователя · структура найдена';
    if (item.manualUpload.processingStatus === 'text_unavailable') return 'PDF пользователя · нужен OCR';
    return 'PDF пользователя · проверить структуру';
  }
  if (item.contentLevel === 'full_text') return `Full text · ${item.license ?? 'разрешённая лицензия'}`;
  if (item.intakeDecision === 'rejected') return 'Исключён intake-gate';
  return 'Аннотация · triage';
}

type QueueItemState = 'manual' | 'fulltext' | 'rejected' | 'triage';

function itemState(item: SourceReviewQueueItem): QueueItemState {
  if (item.manualUpload) return 'manual';
  if (item.contentLevel === 'full_text') return 'fulltext';
  return item.intakeDecision === 'rejected' ? 'rejected' : 'triage';
}

function QueueStateIcon({ state }: { state: QueueItemState }) {
  if (state === 'manual') return <FileUp aria-hidden="true" />;
  if (state === 'fulltext') return <FileCheck2 aria-hidden="true" />;
  if (state === 'rejected') return <ShieldX aria-hidden="true" />;
  return <Archive aria-hidden="true" />;
}

function SourceFileMeta({ item }: { item: SourceReviewQueueItem }) {
  const file = item.manualUpload;
  if (!file) return null;
  return <p className="source-queue-file-meta">{file.pageCount} стр. · {(file.byteSize / 1024 / 1024).toFixed(1)} МБ · {file.extractedCharacters.toLocaleString('ru-RU')} знаков · {rightsLabels[file.rightsBasis]}</p>;
}

function revalidationText(item: SourceReviewQueueItem, overdue: boolean): string {
  if (overdue) return 'Пора перепроверить статус';
  return `Перепроверка до ${new Date(item.revalidationDueAt).toLocaleDateString('ru-RU')}`;
}

function QueueItem({ item, now }: { item: SourceReviewQueueItem; now: string }) {
  const overdue = Date.parse(item.revalidationDueAt) <= Date.parse(now);
  const state = itemState(item);
  return (
    <article className="source-queue-item">
      <span className="source-queue-icon" data-state={state}>
        <QueueStateIcon state={state} />
      </span>
      <div>
        <small>{item.manualUpload?.fileName ?? item.pmcid ?? item.pmid ?? item.sourceId} · {item.recordStatus}</small>
        <h3>{item.title}</h3>
        <p>{contentLabel(item)} · {intakeReasonText(item.intakeReasons)}</p>
        <SourceFileMeta item={item} />
        <em data-overdue={overdue}>{revalidationText(item, overdue)}</em>
      </div>
      <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Открыть источник: ${item.title}`}><ArrowUpRight aria-hidden="true" /></a>
    </article>
  );
}

export function SourceReviewQueue({ refreshKey }: { refreshKey: string }) {
  const [importVersion, setImportVersion] = useState(0);
  const { result, error, loading } = useSourceReviewQueue(`${refreshKey}:${importVersion}`);
  const [filter, setFilter] = useState<QueueFilter>('all');
  const now = result?.generatedAt ?? new Date().toISOString();
  const sources = useMemo(() => result?.sources ?? [], [result]);
  const filtered = useMemo(() => sources.filter((item) => matches(item, filter, now)), [sources, filter, now]);
  const filters: Array<[QueueFilter, string]> = [
    ['all', `Все ${sources.length}`],
    ['manual', `PDF ${sources.filter((item) => item.manualUpload).length}`],
    ['full_text', `Full text ${sources.filter((item) => item.contentLevel === 'full_text').length}`],
    ['triage', `Triage ${sources.filter((item) => item.intakeDecision === 'admitted_to_triage' && item.contentLevel !== 'full_text').length}`],
    ['rejected', `Отсеяно ${sources.filter((item) => item.intakeDecision === 'rejected').length}`],
    ['due', `Перепроверить ${sources.filter((item) => Date.parse(item.revalidationDueAt) <= Date.parse(now)).length}`],
  ];
  return (
    <section className="source-queue-panel">
      <header><div><p className="overline">SOURCE INBOX</p><h2>Очередь источников</h2><p>Отдельно от базы claims. Решения и лицензии остаются проверяемыми.</p></div><RefreshCcw aria-hidden="true" /></header>
      <SourcePdfImport onImported={() => setImportVersion((value) => value + 1)} />
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
