import { Ban, CheckCircle2, CircleAlert, FlaskConical, Target } from 'lucide-react';
import type { SourceAssessmentRecord, SourceReadingBrief as ReadingBrief, TrustBand } from '@/lib/domain';

const bandLabels: Record<TrustBand, string> = {
  very_low: 'очень низкий', low: 'низкий', moderate: 'умеренный', higher: 'выше среднего',
};
const factorLabels = { fit: 'Соответствие вопросу', rigor: 'Надёжность методов', transparency: 'Прозрачность' } as const;
const pointLabels: Record<ReadingBrief['keyPoints'][number]['type'], string> = {
  main_result: 'Главный результат', method: 'Как проверяли', limitation: 'Ограничение',
};

function PointIcon({ type }: { type: ReadingBrief['keyPoints'][number]['type'] }) {
  if (type === 'main_result') return <Target aria-hidden="true" />;
  if (type === 'method') return <FlaskConical aria-hidden="true" />;
  return <CircleAlert aria-hidden="true" />;
}

function ScoreLedger({ assessment }: { assessment: SourceAssessmentRecord }) {
  const profile = assessment.trustProfile;
  return <aside className="source-score-ledger" data-band={profile.band} aria-label={`Ориентир доверия ${profile.score} из 100`}>
    <div><strong>{profile.score}</strong><span>/100</span></div>
    <p>{bandLabels[profile.band]}</p>
    <small>диапазон {profile.range.lower}–{profile.range.upper}</small>
  </aside>;
}

function ScoreFactors({ assessment }: { assessment: SourceAssessmentRecord }) {
  const profile = assessment.trustProfile;
  return <div className="source-score-factors"><header><strong>Из чего сложился ориентир</strong><span>покрытие критериев {profile.coverage}%</span></header>{profile.factors.map((factor) => <div key={factor.id}><span>{factorLabels[factor.id]}</span><div role="meter" aria-label={factorLabels[factor.id]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={factor.score}><i style={{ width: `${factor.score}%` }} /></div><strong>{factor.score}</strong></div>)}</div>;
}

export function SourceReadingBrief({ assessment }: { assessment: SourceAssessmentRecord }) {
  const brief = assessment.readerBrief;
  return <section className="source-reading-brief"><header><div><h4>Коротко о статье</h4><p>Модельный разбор с точной привязкой к тексту источника.</p></div><ScoreLedger assessment={assessment} /></header>
    <p className="source-reading-summary">{brief.plainLanguageSummary}</p>
    <div className="source-key-points">{brief.keyPoints.map((point, index) => <article key={`${point.type}-${index}`} data-type={point.type}><PointIcon type={point.type} /><div><span>{pointLabels[point.type]}</span><p>{point.statement}</p></div></article>)}</div>
    <div className="source-conclusion-boundary"><div><CheckCircle2 aria-hidden="true" /><span><strong>Что можно заключить</strong>{brief.conclusionAllowed}</span></div><div><Ban aria-hidden="true" /><span><strong>Чего заключать нельзя</strong>{brief.conclusionNotAllowed}</span></div></div>
    <ScoreFactors assessment={assessment} />
    <p className="source-score-warning"><CircleAlert aria-hidden="true" /><span><strong>Не вероятность истины.</strong> Score помогает быстро ориентироваться, но не заменяет evidence gate и проверку человеком.</span></p>
  </section>;
}
