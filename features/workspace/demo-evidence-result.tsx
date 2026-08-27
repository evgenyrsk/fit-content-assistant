import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { claims } from '@/features/shared';

interface DemoEvidenceResultProps {
  showAllClaims: boolean;
  onToggleClaims: () => void;
}

export function DemoEvidenceResult({ showAllClaims, onToggleClaims }: DemoEvidenceResultProps) {
  const visibleClaims = showAllClaims ? claims : claims.slice(0, 2);
  return (
    <div className="insight-grid">
      <article className="verdict-card">
        <div className="verdict-top"><span className="card-number">DEMO / 01</span><span className="confidence-pill high">Пример высокой уверенности</span></div>
        <div className="verdict-content"><p className="overline">ПРИМЕР ДОПУСТИМОГО ВЫВОДА</p><h3>Отказ — инструмент,<br />а не обязательное<br /><em>условие роста.</em></h3><p>Если подход заканчивается достаточно близко к отказу, мышцы получают сильный стимул. Постоянный полный отказ может добавить усталости быстрее, чем пользы.</p></div>
        <div className="practical-note"><span>Практический смысл</span><p>Большинство рабочих подходов можно заканчивать, когда в запасе остаётся примерно 1–3 повтора.</p><ArrowDownRight aria-hidden="true" /></div>
      </article>
      <section className="evidence-card">
        <div className="evidence-header">
          <div><p className="overline">DEMO EVIDENCE LEDGER</p><h3>Примеры тезисов</h3></div>
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
        <div className="ledger-note"><span>Это интерфейсный пример</span><p>Новый запуск сначала ищет публикации; научный вывод появится только после evidence review.</p></div>
      </section>
    </div>
  );
}
