import { ArrowUpRight } from 'lucide-react';
import { trendTopics } from '@/features/shared';

interface TrendScoutProps {
  source: string;
  onSourceChange: (source: string) => void;
  onChoose: (topic: string) => void;
}

export function TrendScout({ source, onSourceChange, onChoose }: TrendScoutProps) {
  return (
    <section className="trend-scout">
      <div className="trend-header">
        <div><span>DEMO SIGNALS</span><h2>Что сейчас стоит исследовать</h2></div>
        <label>Источники
          <select value={source} onChange={(event) => onSourceChange(event.target.value)}>
            <option>Instagram + Threads</option><option>Instagram</option><option>Threads</option>
          </select>
        </label>
      </div>
      <p className="trend-disclaimer">Пока показана продуктовая демонстрация отбора. Реальные показатели свежести и роста появятся после подключения live-источников.</p>
      <div className="trend-list">
        {trendTopics.map((trend, index) => (
          <article key={trend.title}>
            <span className="trend-rank">0{index + 1}</span>
            <div>
              <div className="trend-tags"><span>{trend.signal}</span><span>{trend.science}</span></div>
              <h3>{trend.title}</h3><p>{trend.angle}</p><small>{trend.platforms.join(' · ')}</small>
            </div>
            <button onClick={() => onChoose(trend.title)}>Исследовать <ArrowUpRight aria-hidden="true" /></button>
          </article>
        ))}
      </div>
    </section>
  );
}
