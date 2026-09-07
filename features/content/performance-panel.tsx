import { BarChart3, FileUp, Gauge, Save } from 'lucide-react';
import { useState } from 'react';
import type { ContentArchiveItem, PublicationMetricInput } from '@/lib/domain';
import { usePerformance } from './use-performance';

interface Props { items: ContentArchiveItem[] }
const initialCounts = { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 };

export function PerformancePanel({ items }: Props) {
  const performance = usePerformance();
  const [itemId, setItemId] = useState(''); const [platform, setPlatform] = useState('Threads');
  const [counts, setCounts] = useState(initialCounts); const [csv, setCsv] = useState('');

  function changeCount(name: keyof typeof initialCounts, value: string): void {
    setCounts((current) => ({ ...current, [name]: Number(value) }));
  }

  async function saveManual(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const metric: PublicationMetricInput = {
      contentItemId: itemId, platform, recordedAt: new Date().toISOString(), ...counts, source: 'manual',
    };
    if (await performance.saveMetric(metric)) setCounts(initialCounts);
  }

  async function readCsv(file?: File): Promise<void> { if (file) setCsv(await file.text()); }

  return <section className="content-workbench-panel performance-panel"><header><div><p className="overline">PERFORMANCE</p>
    <h2>Метрики публикаций</h2><span>Ручные snapshots и CSV помогают сравнивать подачу, но никогда не меняют scientific confidence.</span></div></header>
    <div className="performance-grid"><section><div className="subsection-heading"><Gauge aria-hidden="true" /><div><h3>Добавить snapshot</h3><p>Текущие цифры опубликованного материала.</p></div></div>
      <form className="metric-form" onSubmit={(event) => void saveManual(event)}><select aria-label="Материал для метрик" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
        <option value="">Выберите материал</option>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <input aria-label="Платформа" value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="Платформа" />
        <div>{Object.keys(initialCounts).map((name) => <label key={name}><span>{name}</span><input type="number" min="0"
          value={counts[name as keyof typeof initialCounts]} onChange={(event) => changeCount(name as keyof typeof initialCounts, event.target.value)} /></label>)}</div>
        <button disabled={performance.saving}><Save aria-hidden="true" />Сохранить</button></form></section>
      <section><div className="subsection-heading"><FileUp aria-hidden="true" /><div><h3>CSV-импорт</h3><p>До 200 snapshots за один импорт.</p></div></div>
        <label className="csv-file"><FileUp aria-hidden="true" /><span>Выбрать CSV</span><input type="file" accept=".csv,text/csv" onChange={(event) => void readCsv(event.target.files?.[0])} /></label>
        <textarea aria-label="CSV с метриками" rows={6} value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="content_item_id,platform,recorded_at,views,likes,comments,saves,shares" />
        <button className="content-primary-action" type="button" disabled={performance.saving || !csv.trim()} onClick={() => void performance.importCsv(csv)}>Импортировать CSV</button></section></div>
    <section className="performance-summary"><div className="subsection-heading"><BarChart3 aria-hidden="true" /><div><h3>Последние результаты</h3>
      <p>{performance.result?.snapshots ?? 0} сохранённых snapshots.</p></div></div><div>
        {performance.result?.summaries.slice(0, 12).map((item) => <article key={`${item.contentItemId}:${item.platform}`}><div><b>{item.platform}</b><span>{item.engagementRate}% engagement</span></div>
          <h3>{item.title}</h3><p>{item.views} просмотров · {item.saves} сохранений ({item.saveRate}%) · {item.shares} репостов ({item.shareRate}%)</p>
          <small>{item.workingExplanation}</small></article>)}</div>
      {!performance.result?.summaries.length && <p className="operations-empty">Метрик пока нет.</p>}</section>
    {performance.error && <p className="operations-error">{performance.error}</p>}
  </section>;
}
