import { ArrowUpRight, CircleCheck, CircleOff, LoaderCircle, Radio, TriangleAlert } from 'lucide-react';
import type { TrendSourceChoice } from '@/features/shared';
import type { TrendDiscoveryResult, TrendSource } from '@/lib/domain';
import { useTrendSignals } from './use-trend-signals';

interface TrendScoutProps {
  source: TrendSourceChoice;
  onSourceChange: (source: TrendSourceChoice) => void;
  onChoose: (topic: string) => void;
}

function MetaSourceState({ result, source, label }: { result: TrendDiscoveryResult | null; source: TrendSource; label: string }) {
  const active = result?.activeSources.includes(source) ?? false;
  return (
    <span className={active ? 'active' : undefined}>
      {active ? <CircleCheck aria-hidden="true" /> : <CircleOff aria-hidden="true" />}
      {label} · {active ? 'доступен' : 'не подключён'}
    </span>
  );
}

export function TrendScout({ source, onSourceChange, onChoose }: TrendScoutProps) {
  const { result, loading } = useTrendSignals(source);

  return (
    <section className="trend-scout">
      <div className="trend-header">
        <div><span><Radio aria-hidden="true" /> LIVE SIGNALS</span><h2>Что сейчас стоит исследовать</h2></div>
        <label>Источники
          <select value={source} onChange={(event) => onSourceChange(event.target.value as TrendSourceChoice)}>
            <option value="all">Все доступные</option><option value="google_trends">Google Trends</option><option value="google_news">Google News proxy</option><option value="pubmed_pulse">PubMed Research Pulse</option><option value="threads">Threads</option><option value="instagram">Instagram</option>
          </select>
        </label>
      </div>
      {!loading && <div className="meta-source-states" aria-label="Статус прямых источников">
        <MetaSourceState result={result} source="threads" label="Threads" />
        <MetaSourceState result={result} source="instagram" label="Instagram" />
      </div>}
      <p className="trend-disclaimer">{loading ? 'Обновляю сигналы…' : result?.message ?? 'Live-источник временно недоступен.'}</p>
      <div className="trend-list">
        {loading && <div className="trend-empty"><LoaderCircle className="spin" aria-hidden="true" /><p>Ищу свежие темы и проверяю их соответствие фитнес-направлению.</p></div>}
        {!loading && !result?.candidates.length && <div className="trend-empty"><TriangleAlert aria-hidden="true" /><p>Подходящих сигналов сейчас нет. Для Threads и Instagram потребуется разрешённое подключение профессионального аккаунта.</p></div>}
        {result?.candidates.map((trend, index) => (
          <article key={trend.title}>
            <span className="trend-rank">0{index + 1}</span>
            <div>
              <div className="trend-tags"><span>{trend.growthSignal}</span><span>Научный потенциал {Math.round(trend.scientificResearchability * 100)}%</span></div>
              <h3>{trend.title}</h3><p>{trend.sourceLabel} · {trend.freshnessMinutes < 60 ? `${trend.freshnessMinutes} мин` : `${Math.round(trend.freshnessMinutes / 60)} ч`} назад</p><small>{trend.platforms.join(' · ')}</small>
            </div>
            <button onClick={() => onChoose(trend.title)}>Исследовать <ArrowUpRight aria-hidden="true" /></button>
          </article>
        ))}
      </div>
    </section>
  );
}
