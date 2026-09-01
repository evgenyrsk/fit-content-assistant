import { BookOpenCheck, Check, CircleAlert, ExternalLink, FileSearch, HelpCircle, Link2, LockKeyhole, MessageSquareText, ShieldCheck, TrendingUp } from 'lucide-react';
import { demoClaim, demoContent, evidenceFlowSources } from './evidence-flow-demo-data';

function QuestionPanel() {
  return <div className="flow-panel flow-question"><span className="flow-panel-number">01</span><p className="overline">RESEARCH QUESTION</p>
    <h3>Обязательно ли тренироваться до полного мышечного отказа, чтобы мышцы росли?</h3>
    <dl><div><dt>Популяция</dt><dd>здоровые взрослые</dd></div><div><dt>Вмешательство</dt><dd>силовая тренировка до отказа</dd></div><div><dt>Сравнение</dt><dd>подходы без полного отказа</dd></div><div><dt>Результат</dt><dd>мышечная гипертрофия</dd></div></dl>
    <p className="flow-callout"><CircleAlert aria-hidden="true" />Система сначала уточняет вопрос. Без population / intervention / comparator / outcome поиск остаётся слишком расплывчатым.</p></div>;
}

function SearchPanel() {
  return <div className="flow-panel"><p className="overline">LIVE SOURCES → RESEARCH CANDIDATES</p><h3>Нашли три релевантных обзора</h3>
    <div className="flow-source-list">{evidenceFlowSources.map((source) => <article key={source.id}><FileSearch aria-hidden="true" /><div><span>{source.design}</span><strong>{source.authors}, {source.year}</strong><p>{source.title}</p></div><a href={source.href} target="_blank" rel="noreferrer" aria-label={`Открыть ${source.title} в PubMed`}><ExternalLink aria-hidden="true" /></a></article>)}</div>
    <p className="flow-callout"><CircleAlert aria-hidden="true" />Найденный источник — ещё не подтверждение. Сначала он проходит intake и методологическую оценку.</p></div>;
}

function AppraisalPanel() {
  const source = evidenceFlowSources[0];
  return <div className="flow-panel"><p className="overline">ARTICLE APPRAISAL · {source.authors.toUpperCase()} {source.year}</p><h3>Что можно и нельзя взять из этой работы</h3>
    <div className="appraisal-grid"><section><strong><Check aria-hidden="true" />Сильные стороны</strong><ul><li>Систематический поиск в трёх базах</li><li>15 исследований по гипертрофии</li><li>Раздельный анализ разных определений отказа</li><li>Открытый полный текст и описанные методы</li></ul></section>
      <section><strong><CircleAlert aria-hidden="true" />Ограничения</strong><ul><li>Небольшой корпус исследований</li><li>Неодинаковые определения отказа</li><li>Неясная фактическая дистанция до отказа</li><li>TESTEX требует отдельной проверки risk of bias</li></ul></section></div>
    <div className="appraisal-result"><BookOpenCheck aria-hidden="true" /><div><span>Предварительное решение</span><strong>Можно использовать в синтезе с явными ограничениями</strong><small>Автоматический approval отключён до калибровки методологии.</small></div></div></div>;
}

function SynthesisPanel() {
  return <div className="flow-panel"><p className="overline">BODY OF EVIDENCE</p><h3>Работы сходятся в главном, но оставляют важный пробел</h3>
    <div className="synthesis-map"><div><span>3</span><p><strong>релевантных обзора</strong><small>разные аналитические подходы</small></p></div><i /><div><span><TrendingUp aria-hidden="true" /></span><p><strong>согласованный сигнал</strong><small>полный отказ не обязателен</small></p></div><i /><div><span><HelpCircle aria-hidden="true" /></span><p><strong>остаётся неопределённость</strong><small>точная оптимальная RIR</small></p></div></div>
    <div className="synthesis-notes"><p><Check aria-hidden="true" />Можно утверждать: обязательное преимущество полного отказа не показано.</p><p><CircleAlert aria-hidden="true" />Нельзя утверждать: любая дистанция от отказа одинаково эффективна.</p></div>
    <span className="human-checkpoint"><LockKeyhole aria-hidden="true" />Предварительная уверенность: умеренная · требуется подтверждение владельца</span></div>;
}

function ClaimPanel() {
  return <div className="flow-panel"><p className="overline">CLAIM LEDGER · DEMO VERSION</p><h3>Допустимый научный вывод</h3>
    <blockquote>{demoClaim}</blockquote>
    <dl className="claim-ledger"><div><dt>Scope</dt><dd>здоровые взрослые · гипертрофия</dd></div><div><dt>Уверенность</dt><dd>предварительно умеренная</dd></div><div><dt>Источники</dt><dd>3 записи · exact provenance</dd></div><div><dt>Статус</dt><dd>демо · не добавлен в базу знаний</dd></div></dl>
    <p className="flow-callout"><CircleAlert aria-hidden="true" />В реальном запуске claim не станет источником для публикации без вашего подтверждения evidence review.</p></div>;
}

function ContentPanel() {
  return <div className="flow-panel"><div className="content-demo-heading"><div><p className="overline">THREADS DRAFT</p><h3>Теперь усиливаем подачу, а не уверенность</h3></div><span><MessageSquareText aria-hidden="true" />Одна сильная мысль</span></div>
    <article className="generated-thread">{demoContent.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>
    <div className="editorial-signals"><span>Контринтуитивный hook</span><span>Разговорный ритм</span><span>Оговорка сохранена</span><span>Новых фактов нет</span></div>
    <small className="editorial-note">Это редакторские признаки, а не прогноз охватов или обещание виральности.</small></div>;
}

function FactCheckPanel() {
  return <div className="flow-panel"><p className="overline">FINAL FACT REVIEW</p><h3>Каждый фактический фрагмент возвращается к claim</h3>
    <div className="trace-list"><article><span>F1</span><p>«Полный отказ не обязателен»</p><i /><strong><Link2 aria-hidden="true" />Claim v.demo</strong><i /><em><Check aria-hidden="true" />Поддержано</em></article>
      <article><span>F2</span><p>«Точная дистанция не определена»</p><i /><strong><Link2 aria-hidden="true" />Caveat</strong><i /><em><Check aria-hidden="true" />Сохранено</em></article></div>
    <div className="final-gate"><ShieldCheck aria-hidden="true" /><div><span>Научный смысл не усилен</span><strong>Готово к вашей финальной проверке</strong><small>Автопубликация отключена. Демо-claim не записан как approved knowledge.</small></div></div>
    <a className="stress-test-link" href="#reviewer-demo">Посмотреть, как gate ломает опасные версии текста <ExternalLink aria-hidden="true" /></a></div>;
}

export function EvidenceFlowPanel({ active }: { active: number }) {
  if (active === 0) return <QuestionPanel />;
  if (active === 1) return <SearchPanel />;
  if (active === 2) return <AppraisalPanel />;
  if (active === 3) return <SynthesisPanel />;
  if (active === 4) return <ClaimPanel />;
  if (active === 5) return <ContentPanel />;
  return <FactCheckPanel />;
}
