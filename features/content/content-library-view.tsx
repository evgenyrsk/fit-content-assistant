import { Archive, ArrowUpRight, Database, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { ContentArchiveItem, ContentFormat as DomainFormat } from '@/lib/domain';
import type { ContentFormat } from '@/features/shared';
import { useContentArchive } from './use-content-archive';

interface ContentLibraryViewProps {
  onCreate: () => void;
  onOpenFormat: (format: ContentFormat) => void;
}

const formatNames: Record<DomainFormat, ContentFormat> = {
  reels: 'Reels', telegram: 'Telegram', threads: 'Threads', carousel: 'Карусель',
};
const statusNames: Record<ContentArchiveItem['status'], string> = {
  ready_for_human_review: 'Ждёт просмотра', needs_review: 'Нужна доработка',
};
const playbooks: Array<{ format: ContentFormat; mark: string; copy: string; className?: string }> = [
  { format: 'Reels', mark: 'R', copy: 'Хук · речь · визуал · удержание' },
  { format: 'Telegram', mark: 'TG', copy: 'Контекст · польза · ясный вывод' },
  { format: 'Threads', mark: 'Th', copy: 'Одна мысль · живой голос · обсуждение', className: 'threads-lane' },
  { format: 'Карусель', mark: 'IG', copy: 'Слайды · логика · визуальный ритм' },
];

function ArchiveEmpty({ loading, error, onCreate }: {
  loading: boolean; error: string | null; onCreate: () => void;
}) {
  if (loading) return <div className="content-archive-empty"><Database aria-hidden="true" />
    <h3>Загружаю реальный архив</h3><p>Материалы читаются из постоянного хранилища.</p></div>;
  if (error) return <div className="content-archive-empty"><Database aria-hidden="true" />
    <h3>Архив временно недоступен</h3><p>{error}</p></div>;
  return <div className="content-archive-empty"><Archive aria-hidden="true" />
    <h3>Реальных материалов пока нет</h3><p>Первый материал появится здесь только после approved-claim и полного контентного gate.</p>
    <button type="button" onClick={onCreate}>Перейти к созданию <ArrowUpRight aria-hidden="true" /></button></div>;
}

function ArchiveTable({ items, onOpenFormat }: {
  items: ContentArchiveItem[]; onOpenFormat: (format: ContentFormat) => void;
}) {
  return <div className="content-table">{items.map((item, index) => <article key={item.id}>
    <span className="item-index">{String(index + 1).padStart(2, '0')}</span>
    <span className="format-badge">{formatNames[item.format]}</span>
    <div><h3>{item.title}</h3><p>{item.claimCount} claims · {item.fragmentCount} фрагментов · {new Intl.DateTimeFormat('ru', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(new Date(item.updatedAt))}</p></div>
    <span className={`item-state state-${item.status}`}>{statusNames[item.status]}</span>
    <button onClick={() => onOpenFormat(formatNames[item.format])} aria-label={`Открыть материал: ${item.title}`}>
      <ArrowUpRight aria-hidden="true" /></button>
  </article>)}</div>;
}

export function ContentLibraryView({ onCreate, onOpenFormat }: ContentLibraryViewProps) {
  const archive = useContentArchive();
  const [format, setFormat] = useState<'all' | DomainFormat>('all');
  const items = format === 'all' ? archive.items : archive.items.filter((item) => item.format === format);
  const ready = archive.items.filter((item) => item.status === 'ready_for_human_review').length;
  const claims = archive.items.reduce((total, item) => total + item.claimCount, 0);
  const fragments = archive.items.reduce((total, item) => total + item.fragmentCount, 0);
  return <section className="product-view">
    <div className="view-hero content-hero"><div><p className="overline">CONTENT LIBRARY</p>
      <h1>Только реальные материалы.<br /><em>Каждый факт трассируется.</em></h1>
      <p>Архив читает сохранённые content items из D1. Демонстрационные записи полностью удалены из этого раздела.</p></div>
      <button className="hero-action" onClick={onCreate}>Создать материал <ArrowUpRight aria-hidden="true" /></button></div>
    <div className="content-summary">
      <article><span>Всего материалов</span><strong>{archive.items.length}</strong><small>канонический архив</small></article>
      <article><span>Ждут просмотра</span><strong>{ready}</strong><small>автопубликация выключена</small></article>
      <article><span>Связанных claims</span><strong>{claims}</strong><small>связей в архиве</small></article>
      <article><span>Фрагментов</span><strong>{fragments}</strong><small>с типом и provenance</small></article>
    </div>
    <section className="platform-lanes"><div className="cluster-heading"><div><p className="overline">FORMAT PLAYBOOKS</p>
      <h2>Отдельный язык каждой платформы</h2></div><span>Не копируем один текст между соцсетями</span></div>
      <div>{playbooks.map((item) => <button className={item.className} key={item.format}
        onClick={() => onOpenFormat(item.format)}><span>{item.mark}</span><p><strong>{item.format}</strong>
          <small>{item.copy}</small></p><ArrowUpRight aria-hidden="true" /></button>)}</div></section>
    <div className="library-panel"><div className="library-toolbar"><div><p className="overline">CANONICAL ARCHIVE</p>
      <h2>Сохранённые материалы <span>{items.length}</span></h2></div>
      <label className="content-format-filter"><SlidersHorizontal aria-hidden="true" /><select value={format}
        onChange={(event) => setFormat(event.target.value as typeof format)}><option value="all">Все форматы</option>
        <option value="reels">Reels</option><option value="telegram">Telegram</option>
        <option value="threads">Threads</option><option value="carousel">Карусели</option></select></label></div>
      {items.length > 0 ? <ArchiveTable items={items} onOpenFormat={onOpenFormat} />
        : <ArchiveEmpty loading={archive.loading} error={archive.error} onCreate={onCreate} />}
    </div>
  </section>;
}
