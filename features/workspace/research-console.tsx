import { ArrowUpRight, ChevronUp, Command, Sparkles } from 'lucide-react';
import { modes, type Mode, type TrendSourceChoice } from '@/features/shared';
import { TrendScout } from './trend-scout';

type WorkStatus = 'idle' | 'working' | 'ready';

interface ResearchConsoleProps {
  topic: string;
  mode: Mode;
  status: WorkStatus;
  trendOpen: boolean;
  trendSource: TrendSourceChoice;
  onTopicChange: (topic: string) => void;
  onModeChange: (mode: Mode) => void;
  onStart: () => void;
  onTrendToggle: () => void;
  onTrendSourceChange: (source: TrendSourceChoice) => void;
  onTrendChoose: (topic: string) => void;
}

export function ResearchConsole(props: ResearchConsoleProps) {
  const { topic, mode, status, trendOpen, trendSource, onTopicChange, onModeChange, onStart, onTrendToggle, onTrendSourceChange, onTrendChoose } = props;

  return (
    <section className="research-console">
      <div className="console-grid" aria-hidden="true" />
      <div className="console-main">
        <span className="console-index">FORME / 001</span>
        <h1>Сначала выясняем,<br />что <em>правда.</em></h1>
        <p className="console-copy">И только потом превращаем доказательства в ясный, интересный контент.</p>
        <div className="mode-switch" role="tablist" aria-label="Режим работы">
          {modes.map((item) => (
            <button className={mode === item.name ? 'selected' : ''} key={item.name} onClick={() => onModeChange(item.name)} role="tab" aria-selected={mode === item.name}>
              <small>{item.index}</small>{item.name}
            </button>
          ))}
        </div>
        <div className="command-box">
          <label htmlFor="topic">
            {mode === 'Исследовать' && 'Какой вопрос разберём?'}
            {mode === 'Создать' && 'На какую тему создаём контент?'}
            {mode === 'Проверить' && 'Демо-вопрос: какой путь проходит научный тезис?'}
          </label>
          <textarea id="topic" rows={2} value={topic} onChange={(event) => onTopicChange(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onStart(); }} />
          <div className="command-footer">
            <span><Command aria-hidden="true" /> Enter, чтобы запустить</span>
            <button onClick={onStart} disabled={status === 'working' || !topic.trim()}>{status === 'working' ? 'Анализирую…' : mode === 'Проверить' ? 'Показать весь путь' : 'Начать'} <ArrowUpRight aria-hidden="true" /></button>
          </div>
        </div>
        <button className="trend-trigger" onClick={onTrendToggle} aria-expanded={trendOpen}>
          <span><Sparkles aria-hidden="true" /></span>
          <p><strong>Подобрать актуальную тему</strong><small>Trend Scout · виральность + научный потенциал</small></p>
          {trendOpen ? <ChevronUp aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
        </button>
        {trendOpen && <TrendScout source={trendSource} onSourceChange={onTrendSourceChange} onChoose={onTrendChoose} />}
      </div>
      <aside className="signal-panel" aria-label="Карта доказательств">
        <div className="signal-caption"><span>Evidence map</span><b>LIVE</b></div>
        <div className={`evidence-orbit ${status === 'working' ? 'is-active' : ''}`}>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <i className="node node-a">A</i><i className="node node-b">B</i><i className="node node-c">C</i><i className="node node-d">D</i>
          <div className="signal-core"><strong>4</strong><span>claims</span></div>
        </div>
        <div className="signal-legend"><span><i className="high-dot" />1 высокая</span><span><i className="medium-dot" />2 умеренные</span><span><i className="low-dot" />1 недостаточно</span></div>
      </aside>
    </section>
  );
}
