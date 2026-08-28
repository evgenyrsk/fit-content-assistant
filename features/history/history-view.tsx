import { Download, SearchCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ResearchArchiveItem } from '@/lib/domain';
import { useResearchArchive } from './use-research-archive';

type Filter = 'all' | 'recent' | 'attention' | 'complete';
const statusNames: Record<ResearchArchiveItem['status'], string> = {
  working: 'В работе', needs_review: 'Нужен review', complete: 'Завершено', failed: 'Ошибка',
};

function csvCell(value: string | number): string { return `"${String(value).replaceAll('"', '""')}"`; }

function exportCsv(items: ResearchArchiveItem[]): void {
  const lines = ['id,query,status,mode,source_count,assessment_count,claim_count,started_at,completed_at',
    ...items.map((item) => [item.id, item.query, item.status, item.mode, item.sourceCount, item.assessmentCount,
      item.claimCount, item.startedAt, item.completedAt ?? ''].map(csvCell).join(','))];
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'forme-research-history.csv'; anchor.click();
  URL.revokeObjectURL(url);
}

export function HistoryView() {
  const archive = useResearchArchive();
  const [filter, setFilter] = useState<Filter>('all');
  const [recentBoundary] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const items = useMemo(() => archive.items.filter((item) => {
    if (filter === 'recent') return new Date(item.startedAt).valueOf() >= recentBoundary;
    if (filter === 'attention') return ['needs_review', 'failed'].includes(item.status);
    if (filter === 'complete') return item.status === 'complete';
    return true;
  }), [archive.items, filter, recentBoundary]);
  const counts = {
    recent: archive.items.filter((item) => new Date(item.startedAt).valueOf() >= recentBoundary).length,
    attention: archive.items.filter((item) => ['needs_review', 'failed'].includes(item.status)).length,
    complete: archive.items.filter((item) => item.status === 'complete').length,
  };
  return <section className="product-view">
    <div className="view-hero history-hero"><div><p className="overline">RESEARCH ARCHIVE</p>
      <h1>Каждый реальный поиск<br /><em>оставляет след.</em></h1>
      <p>Только канонические research runs из D1: источники, assessments, claims и статус обработки.</p></div>
      <div className="history-orbit"><span>{archive.items.length}</span><small>research runs</small><i /><i /></div></div>
    <div className="history-layout"><aside className="history-filter"><p className="overline">ФИЛЬТР</p>
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Все исследования <span>{archive.items.length}</span></button>
      <button className={filter === 'recent' ? 'active' : ''} onClick={() => setFilter('recent')}>Последние 7 дней <span>{counts.recent}</span></button>
      <button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>Требуют внимания <span>{counts.attention}</span></button>
      <button className={filter === 'complete' ? 'active' : ''} onClick={() => setFilter('complete')}>Завершённые <span>{counts.complete}</span></button></aside>
      <div className="history-feed"><div className="history-heading"><div><p className="overline">TIMELINE</p><h2>История исследований</h2></div>
        <button onClick={() => exportCsv(items)} disabled={!items.length}>Экспорт CSV <Download aria-hidden="true" /></button></div>
        {items.map((item) => <article key={item.id}><div className="history-date"><strong>{new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(item.startedAt))}</strong>
          <span>{new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.startedAt))}</span></div><i />
          <div><span className={`history-state ${['needs_review', 'failed'].includes(item.status) ? 'attention' : ''}`}>{statusNames[item.status]}</span>
            <h3>{item.query}</h3><p>{item.sourceCount} источников · {item.assessmentCount} assessments · {item.claimCount} claims</p></div></article>)}
        {!items.length && <div className="history-empty"><SearchCheck aria-hidden="true" /><h3>{archive.loading ? 'Загружаю историю…' : 'Исследований пока нет'}</h3>
          <p>{archive.error ?? 'Первый реальный search run появится здесь после запуска исследования.'}</p></div>}
      </div></div>
  </section>;
}
