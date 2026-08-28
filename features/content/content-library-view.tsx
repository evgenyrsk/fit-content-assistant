import { ArrowUpRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { libraryItems, type ContentFormat } from '@/features/shared';

interface ContentLibraryViewProps {
  onCreate: () => void;
  onOpenFormat: (format: ContentFormat) => void;
}

const playbooks: Array<{ format: ContentFormat; mark: string; title: string; copy: string; className?: string }> = [
  { format: 'Reels', mark: 'R', title: 'Reels', copy: 'Хук · речь · визуал · удержание' },
  { format: 'Telegram', mark: 'TG', title: 'Telegram', copy: 'Контекст · польза · ясный вывод' },
  { format: 'Threads', mark: 'Th', title: 'Threads', copy: 'Одна мысль · живой голос · обсуждение', className: 'threads-lane' },
  { format: 'Карусель', mark: 'IG', title: 'Карусель', copy: 'Слайды · логика · визуальный ритм' },
];

export function ContentLibraryView({ onCreate, onOpenFormat }: ContentLibraryViewProps) {
  return (
    <section className="product-view">
      <div className="view-hero content-hero">
        <div><p className="overline">CONTENT LIBRARY</p><h1>Одна научная база.<br /><em>Много сильных историй.</em></h1><p>Ниже — демо-структура архива. Реальные материалы появятся только из approved-claims.</p></div>
        <button className="hero-action" onClick={onCreate}>Создать материал <ArrowUpRight aria-hidden="true" /></button>
      </div>
      <div className="content-summary">
        <article><span>Демо-материалов</span><strong>08</strong><small>пример будущего архива</small></article>
        <article><span>Демо: готово</span><strong>03</strong><small>не реальные публикации</small></article>
        <article><span>Демо: в работе</span><strong>04</strong><small>черновики интерфейса</small></article>
        <article><span>Демо: идеи</span><strong>01</strong><small>пример структуры</small></article>
      </div>
      <section className="platform-lanes">
        <div className="cluster-heading"><div><p className="overline">FORMAT PLAYBOOKS</p><h2>Отдельный язык каждой платформы</h2></div><span>Не копируем один текст между соцсетями</span></div>
        <div>{playbooks.map((item) => <button className={item.className} key={item.format} onClick={() => onOpenFormat(item.format)}><span>{item.mark}</span><p><strong>{item.title}</strong><small>{item.copy}</small></p><ArrowUpRight aria-hidden="true" /></button>)}</div>
      </section>
      <div className="library-panel">
        <div className="library-toolbar"><div><p className="overline">DEMO · RECENT WORK</p><h2>Пример архива материалов</h2></div><button className="filter-button"><SlidersHorizontal aria-hidden="true" /> Все форматы <ChevronDown aria-hidden="true" /></button></div>
        <div className="content-table">
          {libraryItems.map((item, index) => (
            <article key={item.title}>
              <span className="item-index">{String(index + 1).padStart(2, '0')}</span><span className="format-badge">{item.format}</span>
              <div><h3>{item.title}</h3><p>{item.claims} связанных claims · {item.updated}</p></div>
              <span className={`item-state state-${item.state.toLowerCase()}`}>{item.state}</span>
              <button onClick={() => onOpenFormat(item.format)} aria-label={`Открыть материал: ${item.title}`}><ArrowUpRight aria-hidden="true" /></button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
