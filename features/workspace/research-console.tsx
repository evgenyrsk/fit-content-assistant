import { ArrowUpRight, ChevronUp, Command, Sparkles } from 'lucide-react';
import { modes, type Mode, type TrendSourceChoice } from '@/features/shared';
import { TrendScout } from './trend-scout';
import { useEvidenceMap } from './use-evidence-map';

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

function commandLabel(mode: Mode): string {
  if (mode === 'Исследовать') return 'Какой вопрос разберём?';
  if (mode === 'Создать') return 'На какую тему создаём контент?';
  return 'Демо-вопрос: какой путь проходит научный тезис?';
}

function startLabel(mode: Mode, status: WorkStatus): string {
  if (status === 'working') return 'Анализирую…';
  return mode === 'Проверить' ? 'Показать весь путь' : 'Начать';
}

function EvidenceMap({ status }: { status: WorkStatus }) {
  const evidence = useEvidenceMap();
  const nodeLabels = ['A', 'B', 'C', 'D'].slice(0, Math.min(evidence.total, 4));
  const stateLabels = { syncing: 'SYNC', offline: 'OFFLINE', live: 'LIVE' } as const;
  return <aside className="signal-panel" aria-label="Карта доказательств">
    <div className="signal-caption"><span>Evidence map</span><b data-state={evidence.state}>{stateLabels[evidence.state]}</b></div>
    <div className={`evidence-orbit ${status === 'working' ? 'is-active' : ''}`}>
      <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
      {nodeLabels.map((label) => <i className={`node node-${label.toLowerCase()}`} key={label}>{label}</i>)}
      <div className="signal-core"><strong>{evidence.total}</strong><span>claims</span></div>
    </div>
    <div className="signal-legend"><span><i className="high-dot" />{evidence.high} высокая</span><span><i className="medium-dot" />{evidence.moderate} умеренные</span><span><i className="low-dot" />{evidence.limited} недостаточно</span></div>
  </aside>;
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
          <label htmlFor="topic">{commandLabel(mode)}</label>
          <textarea id="topic" rows={2} value={topic} onChange={(event) => onTopicChange(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onStart(); }} />
          <div className="command-footer">
            <span><Command aria-hidden="true" /> Enter, чтобы запустить</span>
            <button onClick={onStart} disabled={status === 'working' || !topic.trim()}>{startLabel(mode, status)} <ArrowUpRight aria-hidden="true" /></button>
          </div>
        </div>
        <button className="trend-trigger" onClick={onTrendToggle} aria-expanded={trendOpen}>
          <span><Sparkles aria-hidden="true" /></span>
          <p><strong>Подобрать актуальную тему</strong><small>Trend Scout · виральность + научный потенциал</small></p>
          {trendOpen ? <ChevronUp aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
        </button>
        {trendOpen && <TrendScout source={trendSource} onSourceChange={onTrendSourceChange} onChoose={onTrendChoose} />}
      </div>
      <EvidenceMap status={status} />
    </section>
  );
}
