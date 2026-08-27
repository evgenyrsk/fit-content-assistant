import { Layers3, Route, ShieldCheck, UserRoundCheck } from 'lucide-react';

const steps = [
  { icon: Route, index: '01', title: 'Маршрут по дизайну', copy: 'RoB 2, ROBINS-I, QUADAS-2 или AMSTAR 2 выбираются по вопросу и типу исследования.' },
  { icon: ShieldCheck, index: '02', title: 'Gate исследования', copy: 'Ретракции и отсутствующий исход исключаются; неясность и red flags уходят человеку.' },
  { icon: Layers3, index: '03', title: 'Корпус данных', copy: 'GRADE-домены оцениваются отдельно для каждого важного исхода, без среднего балла.' },
  { icon: UserRoundCheck, index: '04', title: 'Ручное подтверждение', copy: 'Автоматическое утверждение claims отключено до экспертной калибровки методологии.' },
];

export function EvidenceMethodologyCard() {
  return (
    <section className="methodology-card">
      <div className="methodology-heading">
        <div><p className="overline">EVIDENCE PROTOCOL</p><h2>Как Forme решает, чему можно доверять</h2></div>
        <span><i /> Draft v0.1 · требуется калибровка</span>
      </div>
      <div className="methodology-steps">
        {steps.map(({ icon: Icon, index, title, copy }) => (
          <article key={index}>
            <div><span>{index}</span><i><Icon aria-hidden="true" /></i></div>
            <h3>{title}</h3><p>{copy}</p>
          </article>
        ))}
      </div>
      <p className="methodology-note">Важно: финансирование не делает работу автоматически ложной. Отдельно проверяются роль спонсора, независимость анализа, отчётность и совокупность результатов.</p>
    </section>
  );
}
