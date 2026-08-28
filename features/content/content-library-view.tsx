import { ArrowUpRight, FilePenLine } from 'lucide-react';
import { useState } from 'react';
import type { ContentArchiveItem } from '@/lib/domain';
import type { ContentFormat } from '@/features/shared';
import { ContentWorkflowBoard } from './content-workflow-board';
import { ManualContentComposer } from './manual-content-composer';
import { PerformancePanel } from './performance-panel';
import { TopicBankPanel } from './topic-bank-panel';
import { useContentArchive } from './use-content-archive';
import { useContentOperations } from './use-content-operations';

interface ContentLibraryViewProps {
  onCreate: () => void;
  onOpenFormat: (format: ContentFormat) => void;
}

const playbooks: Array<{ format: ContentFormat; mark: string; copy: string; className?: string }> = [
  { format: 'Reels', mark: 'R', copy: 'Хук · речь · визуал · удержание' },
  { format: 'Telegram', mark: 'TG', copy: 'Контекст · польза · ясный вывод' },
  { format: 'Threads', mark: 'Th', copy: 'Одна мысль · живой голос · обсуждение', className: 'threads-lane' },
  { format: 'Карусель', mark: 'IG', copy: 'Слайды · логика · визуальный ритм' },
];

export function ContentLibraryView({ onCreate, onOpenFormat }: ContentLibraryViewProps) {
  const archive = useContentArchive();
  const operations = useContentOperations(archive.reload);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<ContentArchiveItem | null>(null);
  const ready = archive.items.filter((item) => item.operation.editorialStatus === 'ready').length;
  const scheduled = archive.items.filter((item) => item.operation.editorialStatus === 'scheduled').length;
  const published = archive.items.filter((item) => item.operation.editorialStatus === 'published').length;

  function edit(item: ContentArchiveItem): void { setEditing(item); setComposerOpen(true); operations.clearError(); }
  function closeComposer(): void { setComposerOpen(false); setEditing(null); operations.clearError(); }

  return <section className="product-view">
    <div className="view-hero content-hero"><div><p className="overline">CONTENT OPERATIONS</p>
      <h1>От идеи до публикации.<br /><em>Без потери evidence.</em></h1>
      <p>Ручные и LLM-материалы проходят единый fact-check, версионирование и редакционный календарь.</p></div>
      <button className="hero-action" onClick={() => setComposerOpen(true)}>Создать вручную <FilePenLine aria-hidden="true" /></button></div>
    <div className="content-summary">
      <article><span>Всего материалов</span><strong>{archive.items.length}</strong><small>канонический D1-архив</small></article>
      <article><span>Готовы</span><strong>{ready}</strong><small>human gate подтверждён</small></article>
      <article><span>В календаре</span><strong>{scheduled}</strong><small>будущие публикации</small></article>
      <article><span>Опубликованы</span><strong>{published}</strong><small>со ссылкой и метриками</small></article>
    </div>
    {composerOpen && <ManualContentComposer key={editing?.id ?? 'new'} item={editing} saving={operations.saving} error={operations.error}
      onClose={closeComposer} onSave={operations.saveManual} />}
    <section className="platform-lanes"><div className="cluster-heading"><div><p className="overline">FORMAT PLAYBOOKS</p>
      <h2>Отдельный язык каждой платформы</h2></div><button className="filter-button" onClick={onCreate}>Открыть LLM-студию <ArrowUpRight aria-hidden="true" /></button></div>
      <div>{playbooks.map((item) => <button className={item.className} key={item.format}
        onClick={() => onOpenFormat(item.format)}><span>{item.mark}</span><p><strong>{item.format}</strong>
          <small>{item.copy}</small></p><ArrowUpRight aria-hidden="true" /></button>)}</div></section>
    <ContentWorkflowBoard items={archive.items} saving={operations.saving} error={archive.error ?? operations.error}
      onEdit={edit} onReview={operations.review} onUpdate={operations.update} />
    <TopicBankPanel />
    <PerformancePanel items={archive.items} />
  </section>;
}
