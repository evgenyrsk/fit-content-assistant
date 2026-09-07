import { Archive, CalendarClock, CheckCircle2, ExternalLink, FileCheck2, Pencil, Send } from 'lucide-react';
import { useState } from 'react';
import type { ContentArchiveItem, ContentOperationInput, ContentReviewInput, EditorialStatus } from '@/lib/domain';

interface Props {
  items: ContentArchiveItem[]; saving: boolean; error: string | null;
  onEdit: (item: ContentArchiveItem) => void;
  onReview: (input: ContentReviewInput) => Promise<boolean>;
  onUpdate: (input: ContentOperationInput) => Promise<boolean>;
}
type ItemProps = Omit<Props, 'items' | 'error'> & { item: ContentArchiveItem };

const statusNames: Record<EditorialStatus, string> = {
  draft: 'Черновик', fact_check: 'Факт-чек', ready: 'Готов', scheduled: 'Запланирован', published: 'Опубликован', archived: 'Архив',
};

function formatDate(value?: string): string {
  if (!value) return 'Без даты';
  return new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ReviewBox({ saving, onSubmit }: { saving: boolean; onSubmit: (input: Omit<ContentReviewInput, 'contentItemId'>) => void }) {
  const [checks, setChecks] = useState({ trace: false, caveats: false, platform: false });
  const [notes, setNotes] = useState('');
  function submit(decision: 'approved' | 'rejected'): void {
    onSubmit({ decision, traceChecked: checks.trace, caveatsChecked: checks.caveats, platformFitChecked: checks.platform, notes });
  }
  return <div className="content-review-box"><div><CheckCircle2 aria-hidden="true" /><strong>Human fact-check</strong></div>
    <label><input type="checkbox" checked={checks.trace} onChange={(event) => setChecks({ ...checks, trace: event.target.checked })} />Трассировка каждого факта проверена</label>
    <label><input type="checkbox" checked={checks.caveats} onChange={(event) => setChecks({ ...checks, caveats: event.target.checked })} />Оговорки и scope сохранены</label>
    <label><input type="checkbox" checked={checks.platform} onChange={(event) => setChecks({ ...checks, platform: event.target.checked })} />Формат платформы соблюдён</label>
    <textarea aria-label="Комментарий к факт-чеку" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Комментарий или причина возврата" />
    <div><button type="button" disabled={saving} onClick={() => submit('rejected')}>Вернуть</button>
      <button type="button" disabled={saving} onClick={() => submit('approved')}>Подтвердить</button></div></div>;
}

function ItemActions({ item, onEdit, onReviewToggle, onUpdate }: Omit<ItemProps, 'saving' | 'onReview'> & { onReviewToggle: () => void }) {
  const [schedule, setSchedule] = useState(''); const [url, setUrl] = useState('');
  const status = item.operation.editorialStatus;
  function scheduleItem(): void {
    void onUpdate({ contentItemId: item.id, editorialStatus: 'scheduled', scheduledFor: schedule ? new Date(schedule).toISOString() : undefined });
  }
  return <div className="workflow-actions"><button type="button" onClick={() => onEdit(item)} disabled={status === 'published'}>
    <Pencil aria-hidden="true" />Редактировать</button>
    {item.status === 'needs_review' && <button type="button" onClick={onReviewToggle}><FileCheck2 aria-hidden="true" />Факт-чек</button>}
    {status === 'ready' && <><input type="datetime-local" aria-label={`Дата публикации ${item.title}`} value={schedule} onChange={(event) => setSchedule(event.target.value)} />
      <button type="button" onClick={scheduleItem}><CalendarClock aria-hidden="true" />В календарь</button></>}
    {status === 'scheduled' && <><button type="button" onClick={() => void onUpdate({ contentItemId: item.id, editorialStatus: 'ready' })}><CalendarClock aria-hidden="true" />Снять с календаря</button>
      <input type="url" placeholder="Ссылка после публикации" aria-label={`Ссылка публикации ${item.title}`} value={url} onChange={(event) => setUrl(event.target.value)} />
      <button type="button" onClick={() => void onUpdate({ contentItemId: item.id, editorialStatus: 'published', publicationUrl: url })}><Send aria-hidden="true" />Опубликован</button></>}
    {status === 'published' && <button type="button" onClick={() => void onUpdate({ contentItemId: item.id, editorialStatus: 'archived' })}><Archive aria-hidden="true" />В архив</button>}
    {status === 'archived' && <button type="button" onClick={() => void onUpdate({ contentItemId: item.id, editorialStatus: 'draft' })}><Pencil aria-hidden="true" />Вернуть в работу</button>}
  </div>;
}

function WorkflowItem({ item, saving, onEdit, onReview, onUpdate }: ItemProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  async function review(input: Omit<ContentReviewInput, 'contentItemId'>): Promise<void> {
    if (await onReview({ ...input, contentItemId: item.id })) setReviewOpen(false);
  }
  return <article className={`workflow-item status-${item.operation.editorialStatus}`}><div className="workflow-item-head">
    <span className="format-badge">{item.format}</span><div><h3>{item.title}</h3>
      <p>v{Math.max(item.versionCount, 1)} · {item.claimCount} claims · обновлено {formatDate(item.updatedAt)}</p></div>
    <b>{statusNames[item.operation.editorialStatus]}</b></div>
    <p className="workflow-preview">{item.text || 'Текст сохранён в структурированных фрагментах.'}</p>
    {item.operation.scheduledFor && <p className="workflow-schedule"><CalendarClock aria-hidden="true" />{formatDate(item.operation.scheduledFor)}</p>}
    {item.operation.publicationUrl && <a href={item.operation.publicationUrl} target="_blank" rel="noreferrer">Открыть публикацию <ExternalLink aria-hidden="true" /></a>}
    <ItemActions item={item} onEdit={onEdit} onUpdate={onUpdate} onReviewToggle={() => setReviewOpen((value) => !value)} />
    {reviewOpen && <ReviewBox saving={saving} onSubmit={(input) => void review(input)} />}
  </article>;
}

export function ContentWorkflowBoard({ items, saving, error, onEdit, onReview, onUpdate }: Props) {
  return <section className="content-workbench-panel content-workflow-board"><header><div>
    <p className="overline">EDITORIAL WORKFLOW</p><h2>Архив и календарь</h2>
    <span>Научный gate и редакционный статус хранятся отдельно. Публикация остаётся ручной.</span></div></header>
    <div className="workflow-list">{items.map((item) => <WorkflowItem key={item.id} item={item} saving={saving}
      onEdit={onEdit} onReview={onReview} onUpdate={onUpdate} />)}</div>
    {items.length === 0 && <p className="operations-empty">Материалов пока нет. Создайте первый вручную — LLM для этого не нужен.</p>}
    {error && <p className="operations-error">{error}</p>}
  </section>;
}
