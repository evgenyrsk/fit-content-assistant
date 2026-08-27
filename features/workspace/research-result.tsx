import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { claims } from '@/features/shared';

interface ResearchResultProps {
  topic: string;
  working: boolean;
  showAllClaims: boolean;
  onToggleClaims: () => void;
}

export function ResearchResult({ topic, working, showAllClaims, onToggleClaims }: ResearchResultProps) {
  const visibleClaims = showAllClaims ? claims : claims.slice(0, 2);

  return (
    <>
      <section className="flow-strip" aria-label="Исследовательский процесс">
        <div className={working ? 'complete' : ''}><span>01</span><p><strong>Найти</strong><small>релевантные работы</small></p></div><i />
        <div className={working ? 'current' : ''}><span>02</span><p><strong>Оценить</strong><small>качество данных</small></p></div><i />
        <div><span>03</span><p><strong>Утверждать</strong><small>только допустимое</small></p></div><i />
        <div><span>04</span><p><strong>Объяснить</strong><small>простым языком</small></p></div>
      </section>
      <section className={`result-section ${working ? 'is-loading' : ''}`}>
        <div className="section-title">
          <div><p className="overline">ТЕКУЩИЙ РАЗБОР · ДЕМО</p><h2>{topic || 'Новая тема'}</h2></div>
          <span className="result-status"><i />{working ? 'Идёт оценка' : 'Готово к редактуре'}</span>
        </div>
        <div className="insight-grid">
          <article className="verdict-card">
            <div className="verdict-top"><span className="card-number">01</span><span className="confidence-pill high">Высокая уверенность</span></div>
            <div className="verdict-content"><p className="overline">ЧТО МОЖНО УТВЕРЖДАТЬ</p><h3>Отказ — инструмент,<br />а не обязательное<br /><em>условие роста.</em></h3><p>Если подход заканчивается достаточно близко к отказу, мышцы получают сильный стимул. Постоянный полный отказ может добавить усталости быстрее, чем пользы.</p></div>
            <div className="practical-note"><span>Практический смысл</span><p>Большинство рабочих подходов можно заканчивать, когда в запасе остаётся примерно 1–3 повтора.</p><ArrowDownRight aria-hidden="true" /></div>
          </article>
          <section className="evidence-card">
            <div className="evidence-header">
              <div><p className="overline">EVIDENCE LEDGER</p><h3>Проверенные тезисы</h3></div>
              <button onClick={onToggleClaims}>{showAllClaims ? 'Свернуть' : 'Показать все'}{showAllClaims ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</button>
            </div>
            <div className="claim-list">
              {visibleClaims.map((claim) => (
                <article className="claim" key={claim.text}>
                  <span className={`claim-marker ${claim.tone}`}>{claim.marker}</span>
                  <div><span className={`claim-confidence ${claim.tone}`}>{claim.confidence}</span><p>{claim.text}</p><small>{claim.evidence}</small></div>
                  <ArrowUpRight aria-hidden="true" />
                </article>
              ))}
            </div>
            <div className="ledger-note"><span>Разделение сохранено</span><p>Найденные работы → оценка качества → допустимый вывод → человеческое объяснение.</p></div>
          </section>
        </div>
      </section>
    </>
  );
}
