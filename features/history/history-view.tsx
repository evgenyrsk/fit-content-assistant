import { ArrowUpRight } from 'lucide-react';
import { historyItems } from '@/features/shared';

export function HistoryView() {
  return (
    <section className="product-view">
      <div className="view-hero history-hero">
        <div><p className="overline">RESEARCH ARCHIVE</p><h1>Каждый вывод<br /><em>оставляет след.</em></h1><p>История исследований сохраняет изменения, противоречия и причины пересмотра выводов.</p></div>
        <div className="history-orbit"><span>12</span><small>research runs</small><i /><i /></div>
      </div>
      <div className="history-layout">
        <aside className="history-filter">
          <p className="overline">ПЕРИОД</p>
          <button className="active">Все исследования <span>12</span></button>
          <button>Последние 7 дней <span>04</span></button>
          <button>Требуют внимания <span>02</span></button>
          <button>Обновлённые выводы <span>01</span></button>
        </aside>
        <div className="history-feed">
          <div className="history-heading"><div><p className="overline">TIMELINE</p><h2>Последние исследования</h2></div><button>Экспорт истории <ArrowUpRight aria-hidden="true" /></button></div>
          {historyItems.map((item) => (
            <article key={item.title}>
              <div className="history-date"><strong>{item.date}</strong><span>{item.time}</span></div><i />
              <div><span className={`history-state ${item.state === 'Перепроверить' ? 'attention' : ''}`}>{item.state}</span><h3>{item.title}</h3><p>{item.detail}</p></div>
              <button aria-label="Открыть исследование"><ArrowUpRight aria-hidden="true" /></button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
