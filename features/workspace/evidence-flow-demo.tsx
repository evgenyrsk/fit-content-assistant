'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FlaskConical, X } from 'lucide-react';
import { evidenceFlowSteps, stageGuardrails } from './evidence-flow-demo-data';
import { EvidenceFlowPanel } from './evidence-flow-panels';

export function EvidenceFlowDemo() {
  const [active, setActive] = useState(0);
  const [does, avoids] = stageGuardrails[active];

  function selectStage(index: number) {
    setActive(index);
    document.getElementById('evidence-flow-demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return <section className="evidence-flow-demo" id="evidence-flow-demo" aria-labelledby="evidence-flow-title">
    <header className="evidence-flow-header"><div><p className="overline">END-TO-END CONTROLLED DEMO</p><h2 id="evidence-flow-title">От научного вопроса до контента, которому можно верить</h2><p>Источники реальные. Оценка и контент показаны как воспроизводимый демо-проход и не записываются в базу знаний.</p></div><span><FlaskConical aria-hidden="true" />Тема: отказ и гипертрофия</span></header>
    <nav className="evidence-flow-nav" aria-label="Этапы сквозного сценария">{evidenceFlowSteps.map((step, index) => <button type="button" key={step.index} data-active={index === active} data-complete={index < active} onClick={() => selectStage(index)} aria-current={index === active ? 'step' : undefined}>
      <span>{index < active ? <Check aria-hidden="true" /> : step.index}</span><p><strong>{step.title}</strong><small>{step.caption}</small></p></button>)}</nav>
    <div className="evidence-flow-workbench"><EvidenceFlowPanel active={active} /><aside><p className="overline">ЧТО ПРОИСХОДИТ</p><section><Check aria-hidden="true" /><div><strong>Система делает</strong><p>{does}</p></div></section><section><span><X aria-hidden="true" /></span><div><strong>Система не делает</strong><p>{avoids}</p></div></section><div className="stage-position"><span>{String(active + 1).padStart(2, '0')}</span><i><b style={{ width: `${((active + 1) / evidenceFlowSteps.length) * 100}%` }} /></i><em>из 07</em></div></aside></div>
    <footer className="evidence-flow-controls"><button type="button" onClick={() => selectStage(active - 1)} disabled={active === 0}><ArrowLeft aria-hidden="true" />Назад</button><p><strong>{evidenceFlowSteps[active].title}</strong><span>{evidenceFlowSteps[active].caption}</span></p><button type="button" onClick={() => selectStage(active + 1)} disabled={active === evidenceFlowSteps.length - 1}>{active === evidenceFlowSteps.length - 1 ? 'Путь завершён' : 'Следующий этап'}<ArrowRight aria-hidden="true" /></button></footer>
  </section>;
}
