import { ArrowUpRight, Check, X } from 'lucide-react';
import { contentByFormat, type ContentFormat } from '@/features/shared';

interface ContentComposerProps {
  activeFormat: ContentFormat | null;
  onFormatChange: (format: ContentFormat | null) => void;
}

export function ContentComposer({ activeFormat, onFormatChange }: ContentComposerProps) {
  const selectedContent = activeFormat ? contentByFormat[activeFormat] : null;

  return (
    <>
      <section className="content-launcher">
        <div className="launcher-copy"><span className="launcher-index">02</span><div><p className="overline">CONTENT ENGINE</p><h2>Упаковать правду интересно.</h2><p>Один вывод — разные углы для каждой платформы.</p></div></div>
        <div className="format-buttons">
          {(Object.keys(contentByFormat) as ContentFormat[]).map((format) => (
            <button className={activeFormat === format ? 'chosen' : ''} key={format} onClick={() => onFormatChange(format)}><span>{format}</span><ArrowUpRight aria-hidden="true" /></button>
          ))}
        </div>
      </section>
      {selectedContent && (
        <section className="content-studio">
          <div className="studio-header">
            <div><p className="overline">{activeFormat} · ЧЕРНОВИК</p><h2>{selectedContent.title}</h2><span>{selectedContent.meta}</span></div>
            <button onClick={() => onFormatChange(null)} aria-label="Закрыть редактор"><X aria-hidden="true" /></button>
          </div>
          <div className="draft">
            {selectedContent.body.map((paragraph, index) => <article key={paragraph}><span>{String(index + 1).padStart(2, '0')}</span><p>{paragraph}</p></article>)}
          </div>
          <aside className="factcheck">
            <div><span><Check aria-hidden="true" /></span><p><strong>Демо проверки структуры</strong><small>Настоящий фактчек включится после утверждения claims</small></p></div>
            <p>Это пример интерфейса, а не автоматически проверенный материал. До калибровки evidence gate публикация остаётся заблокированной.</p>
          </aside>
        </section>
      )}
    </>
  );
}
