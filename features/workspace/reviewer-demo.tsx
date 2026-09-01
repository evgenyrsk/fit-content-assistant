'use client';

import { useMemo, useState } from 'react';
import { Bot, Check, ChevronRight, Clock3, Coins, FlaskConical, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { reviewerDemoCases, type ReviewerDecision } from './reviewer-demo-data';

const decisionLabels: Record<ReviewerDecision, string> = {
  approved: 'Пропущено', rejected: 'Заблокировано', contract_error: 'Ошибка контракта',
};

function DecisionIcon({ decision }: { decision: ReviewerDecision }) {
  return decision === 'approved' ? <Check aria-hidden="true" /> : decision === 'rejected' ? <X aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />;
}

export function ReviewerDemo() {
  const [selectedId, setSelectedId] = useState(reviewerDemoCases[0].id);
  const selected = useMemo(() => reviewerDemoCases.find((item) => item.id === selectedId) ?? reviewerDemoCases[0], [selectedId]);

  return (
    <section className="reviewer-demo" id="reviewer-demo" aria-labelledby="reviewer-demo-title">
      <header className="reviewer-demo-header">
        <div><p className="overline">SAFETY REVIEW · REAL ROUTERAI RUN</p><h2 id="reviewer-demo-title">Как система ловит опасные искажения</h2>
          <p>Восемь контролируемых кейсов, прогнанных 1 сентября 2026 года. Это проверка защитного контура, а не база научных фактов.</p></div>
        <span><FlaskConical aria-hidden="true" /> Eval v1.2.0</span>
      </header>

      <div className="reviewer-scoreboard">
        <article><Bot aria-hidden="true" /><div><strong>8 / 8</strong><span>GPT-5 Mini</span><small>17,6 с · ≈ 0,3545 ₽</small></div></article>
        <article><Bot aria-hidden="true" /><div><strong>7 / 8</strong><span>DeepSeek V3.2</span><small>64,2 с · ≈ 0,1781 ₽</small></div></article>
        <article><ShieldCheck aria-hidden="true" /><div><strong>0 ₽</strong><span>Жёсткий gate</span><small>1 кейс без вызова LLM</small></div></article>
      </div>

      <div className="reviewer-workbench">
        <nav className="reviewer-case-list" aria-label="Тестовые кейсы">
          {reviewerDemoCases.map((item, index) => <button type="button" key={item.id} data-active={item.id === selected.id} onClick={() => setSelectedId(item.id)}>
            <span>{String(index + 1).padStart(2, '0')}</span><p><strong>{item.title}</strong><small>{item.risk}</small></p><ChevronRight aria-hidden="true" />
          </button>)}
        </nav>

        <article className="reviewer-case-detail">
          <div className="reviewer-case-meta"><span data-decision={selected.expected}>{selected.expected === 'approved' ? 'Должно пройти' : 'Должно быть заблокировано'}</span>
            <em>{selected.handledBy === 'gate' ? <ShieldCheck aria-hidden="true" /> : <Bot aria-hidden="true" />}{selected.handledBy === 'gate' ? 'Решил код' : 'Проверили модели'}</em></div>
          <h3>{selected.title}</h3>
          <div className="reviewer-input"><span>Входной текст</span><p>{selected.input}</p></div>
          <div className="reviewer-route-results">
            {selected.results.map((result) => <section key={result.route} data-decision={result.decision}>
              <header><span><DecisionIcon decision={result.decision} /></span><div><strong>{result.route}</strong><small>{decisionLabels[result.decision]}</small></div></header>
              <p>{result.reason}</p>
            </section>)}
          </div>
          <footer className="reviewer-demo-note"><Clock3 aria-hidden="true" /><p><strong>Это воспроизведение реального теста.</strong> Ответы сохранены как контрольный eval; новый платный запрос при переключении кейсов не выполняется.</p><Coins aria-hidden="true" /></footer>
        </article>
      </div>
    </section>
  );
}
