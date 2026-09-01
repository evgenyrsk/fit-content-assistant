import { Bot, Check, CircleAlert, FlaskConical, LockKeyhole, Play, ShieldCheck } from 'lucide-react';
import type { BodyAssessmentResponse, ResearchSearchResult, SourceAssessmentResponse } from '@/lib/domain';
import { certaintyLabels, concernLabels, domainLabels, studyDecisionLabels, studyReasonLabels } from './evidence-review-presentation';
import { useLiveEvidenceWorkbench } from './use-live-evidence-workbench';

function sourceTitle(result: ResearchSearchResult, sourceId: string): string {
  const pmid = sourceId.replace('pmid:', '');
  return result.candidates.find((item) => item.pmid === pmid)?.title ?? sourceId;
}

function AssessmentResult({ response }: { response: SourceAssessmentResponse }) {
  if (!response.assessment) return <div className="live-assessment-warning"><CircleAlert aria-hidden="true" /><p>{response.warning}</p></div>;
  const { assessment } = response;
  return <div className="live-assessment-result">
    <header><span data-decision={assessment.gate.decision}>{studyDecisionLabels[assessment.gate.decision]}</span><em>{assessment.input.studyDesign.replaceAll('_', ' ')}</em></header>
    <p>{assessment.finding.effectEstimate}</p>
    <small>{assessment.finding.statisticalUncertainty} · {assessment.finding.practicalSignificance}</small>
    <div>{assessment.gate.reasons.map((reason) => <span key={reason}>{studyReasonLabels[reason]}</span>)}</div>
  </div>;
}

function BodyResult({ response }: { response: BodyAssessmentResponse }) {
  if (!response.body) return <div className="live-body-locked"><LockKeyhole aria-hidden="true" /><div><strong>Claim не создаётся</strong><p>{response.warning}</p></div></div>;
  const record = response.body;
  return <div className="live-body-result"><header><div><span>Предварительная уверенность</span><strong>{certaintyLabels[record.assessment.proposedCertainty]}</strong></div><em>{record.gate.decision === 'ready_for_claim_review' ? 'готово к claim review' : 'нужна проверка человека'}</em></header>
    <p>{record.assessment.rationale}</p><div className="live-grade-grid">{record.assessment.domains.map((domain) => <article key={domain.domain}><strong>{domainLabels[domain.domain]}</strong><span>{concernLabels[domain.concern]}</span><small>{domain.rationale}</small></article>)}</div>
    <footer><LockKeyhole aria-hidden="true" /><p><strong>Автоматический claim заблокирован.</strong> {response.warning}</p></footer></div>;
}

function AssessmentItem({ result, sourceId, index, running, response }: {
  result: ResearchSearchResult; sourceId: string; index: number; running: boolean; response?: SourceAssessmentResponse;
}) {
  const state = running ? 'running' : response ? 'complete' : 'waiting';
  const status = running ? 'модель анализирует' : response ? 'черновик оценки готов' : 'ожидает запуска';
  return <article data-state={state}><div className="live-assessment-title"><span>{response ? <Check aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span><div><small>{sourceId} · полный текст · {status}</small><h3>{sourceTitle(result, sourceId)}</h3></div></div>{response && <AssessmentResult response={response} />}</article>;
}

function assessButtonLabel(running: boolean, complete: number, total: number): string {
  if (running) return `Оцениваю ${Math.min(complete + 1, total)} из ${total}`;
  return complete ? 'Повторить оценки' : `Оценить ${total} ${total === 1 ? 'документ' : 'документа'}`;
}

export function LiveEvidenceWorkbench({ result, question }: { result: ResearchSearchResult; question: string }) {
  const flow = useLiveEvidenceWorkbench(result, question);
  if (flow.targets.length === 0) return null;
  const complete = Object.keys(flow.assessments).length;
  return <section className="live-evidence-workbench">
    <header><div><p className="overline">LIVE EVIDENCE REVIEW</p><h2>Оценить полные тексты</h2><p>LLM получает ограниченный пакет Methods/Results с provenance. Аннотации остаются контекстом и не расходуют бюджет оценки.</p></div><span><FlaskConical aria-hidden="true" />Реальный запуск</span></header>
    <div className="live-assessment-list">{flow.targets.map((sourceId, index) => <AssessmentItem key={sourceId} result={result} sourceId={sourceId} index={index} running={flow.runningSourceId === sourceId} response={flow.assessments[sourceId]} />)}</div>
    {flow.error && <p className="live-evidence-error"><CircleAlert aria-hidden="true" />{flow.error}</p>}
    <div className="live-evidence-actions"><button type="button" onClick={() => void flow.assess()} disabled={Boolean(flow.runningSourceId) || flow.synthesizing}><Play aria-hidden="true" />{assessButtonLabel(Boolean(flow.runningSourceId), complete, flow.targets.length)}</button>
      <button type="button" onClick={() => void flow.synthesize()} disabled={!flow.canSynthesize || Boolean(flow.runningSourceId) || flow.synthesizing}><Bot aria-hidden="true" />{flow.synthesizing ? 'Собираю evidence body…' : 'Собрать совокупность данных'}</button></div>
    {flow.body && <BodyResult response={flow.body} />}
    {!flow.body && <div className="live-workbench-gate"><ShieldCheck aria-hidden="true" /><p><strong>Следующий gate закрыт.</strong> Сначала нужны source assessments; затем body assessment и ваше подтверждение.</p></div>}
  </section>;
}
