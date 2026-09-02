import { Bot, Check, CircleAlert, FlaskConical, LockKeyhole, Play, ShieldCheck } from 'lucide-react';
import type {
  BodyAssessmentResponse,
  BodyAssessmentHumanReview,
  ResearchSearchResult,
  SourceAssessmentHumanReview,
  SourceAssessmentResponse,
} from '@/lib/domain';
import type { ContentFormat } from '@/features/shared';
import { BodyAssessmentReview } from './body-assessment-review';
import { ClaimDraftResult } from './claim-draft-result';
import { certaintyLabels, concernLabels, domainLabels, studyDecisionLabels, studyReasonLabels } from './evidence-review-presentation';
import { SourceAssessmentReview } from './source-assessment-review';
import { SourceReadingBrief } from './source-reading-brief';
import { useLiveEvidenceWorkbench } from './use-live-evidence-workbench';

function sourceTitle(result: ResearchSearchResult, sourceId: string): string {
  const pmid = sourceId.replace('pmid:', '');
  return result.candidates.find((item) => item.pmid === pmid)?.title ?? sourceId;
}

function AssessmentResult({ response, onReviewed }: {
  response: SourceAssessmentResponse; onReviewed: (review: SourceAssessmentHumanReview) => void;
}) {
  if (!response.assessment) return <div className="live-assessment-warning"><CircleAlert aria-hidden="true" /><p>{response.warning}</p></div>;
  const { assessment } = response;
  return <div className="live-assessment-result">
    <header><span data-decision={assessment.gate.decision}>{studyDecisionLabels[assessment.gate.decision]}</span><em>{assessment.input.studyDesign.replaceAll('_', ' ')}</em></header>
    <SourceReadingBrief assessment={assessment} />
    <details className="source-technical-details"><summary>Показать технические детали оценки</summary><p>{assessment.finding.effectEstimate}</p><small>{assessment.finding.statisticalUncertainty} · {assessment.finding.practicalSignificance}</small><div>{assessment.gate.reasons.map((reason) => <span key={reason}>{studyReasonLabels[reason]}</span>)}</div></details>
    <SourceAssessmentReview assessment={assessment} onReviewed={onReviewed} />
  </div>;
}

function BodyResult({ response, onReviewed }: {
  response: BodyAssessmentResponse; onReviewed: (review: BodyAssessmentHumanReview) => void;
}) {
  if (!response.body) return <div className="live-body-locked"><LockKeyhole aria-hidden="true" /><div><strong>Claim не создаётся</strong><p>{response.warning}</p></div></div>;
  const record = response.body;
  return <><div className="live-body-result"><header><div><span>Предварительная уверенность</span><strong>{certaintyLabels[record.assessment.proposedCertainty]}</strong></div><em>{record.gate.decision === 'ready_for_claim_review' ? 'готово к claim review' : 'нужна проверка человека'}</em></header>
    <p>{record.assessment.rationale}</p><div className="live-grade-grid">{record.assessment.domains.map((domain) => <article key={domain.domain}><strong>{domainLabels[domain.domain]}</strong><span>{concernLabels[domain.concern]}</span><small>{domain.rationale}</small></article>)}</div>
    <footer><LockKeyhole aria-hidden="true" /><p><strong>Автоматическое утверждение заблокировано.</strong> {response.warning}</p></footer></div><BodyAssessmentReview body={record} onReviewed={onReviewed} /></>;
}

function assessmentStatus(running: boolean, response?: SourceAssessmentResponse): string {
  if (running) return 'модель анализирует';
  return response ? 'черновик оценки готов' : 'ожидает запуска';
}

function AssessmentMarker({ response, index }: { response?: SourceAssessmentResponse; index: number }) {
  return <span>{response ? <Check aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>;
}

function PendingScore({ running, failed }: { running: boolean; failed: boolean }) {
  const label = running ? 'считаю' : failed ? 'не рассчитан' : 'после оценки';
  return <div className="source-score-pending" aria-label="Индекс доверия ожидает оценки"><strong>—</strong><span>/100</span><small>{label}</small></div>;
}

function AssessmentItem({ result, sourceId, index, running, response, onReviewed }: {
  result: ResearchSearchResult; sourceId: string; index: number; running: boolean;
  response?: SourceAssessmentResponse; onReviewed: (review: SourceAssessmentHumanReview) => void;
}) {
  const state = running ? 'running' : response ? 'complete' : 'waiting';
  return <article data-state={state}><div className="live-assessment-title"><AssessmentMarker response={response} index={index} /><div><small>{sourceId} · полный текст · {assessmentStatus(running, response)}</small><h3>{sourceTitle(result, sourceId)}</h3></div>{!response?.assessment && <PendingScore running={running} failed={Boolean(response)} />}</div>{response && <AssessmentResult response={response} onReviewed={onReviewed} />}</article>;
}

function assessButtonLabel(running: boolean, complete: number, total: number): string {
  if (running) return `Оцениваю ${Math.min(complete + 1, total)} из ${total}`;
  return complete ? 'Повторить оценки' : `Оценить ${total} ${total === 1 ? 'документ' : 'документа'}`;
}

type EvidenceFlow = ReturnType<typeof useLiveEvidenceWorkbench>;

function ClaimDraftAction({ flow }: { flow: EvidenceFlow }) {
  if (flow.bodyReview?.decision !== 'confirmed' || !flow.body?.body) return null;
  return <div className="claim-draft-action"><div><strong>Совокупность подтверждена</strong><p>Можно подготовить узкий тезис с точными evidence links. Это ещё не знание и не контент.</p></div><button type="button" disabled={flow.preparingClaim} onClick={() => void flow.prepareClaim(flow.body?.body?.id ?? '')}><Bot aria-hidden="true" />{flow.preparingClaim ? 'Готовлю claim draft…' : 'Подготовить claim draft'}</button></div>;
}

function BodyFlow({ flow, onContentFormat }: { flow: EvidenceFlow; onContentFormat: (format: ContentFormat, claimVersionId: string) => void }) {
  return <>{flow.body && <BodyResult response={flow.body} onReviewed={flow.recordBodyReview} />}<ClaimDraftAction flow={flow} />{flow.claim && <ClaimDraftResult response={flow.claim} onContentFormat={onContentFormat} />}</>;
}

export function LiveEvidenceWorkbench({ result, question, onContentFormat }: {
  result: ResearchSearchResult; question: string;
  onContentFormat: (format: ContentFormat, claimVersionId: string) => void;
}) {
  const flow = useLiveEvidenceWorkbench(result, question);
  if (flow.targets.length === 0) return null;
  const complete = Object.keys(flow.assessments).length;
  return <section className="live-evidence-workbench">
    <header><div><p className="overline">LIVE EVIDENCE REVIEW</p><h2>Оценить полные тексты</h2><p>После оценки справа у каждой статьи появится индекс доверия 0–100, диапазон и расшифровка факторов. Аннотации остаются контекстом и не оцениваются.</p></div><span><FlaskConical aria-hidden="true" />Реальный запуск</span></header>
    <div className="live-assessment-list">{flow.targets.map((sourceId, index) => <AssessmentItem key={sourceId} result={result} sourceId={sourceId} index={index} running={flow.runningSourceId === sourceId} response={flow.assessments[sourceId]} onReviewed={flow.recordReview} />)}</div>
    {flow.error && <p className="live-evidence-error"><CircleAlert aria-hidden="true" />{flow.error}</p>}
    <div className="live-evidence-actions"><button type="button" onClick={() => void flow.assess()} disabled={Boolean(flow.runningSourceId) || flow.synthesizing}><Play aria-hidden="true" />{assessButtonLabel(Boolean(flow.runningSourceId), complete, flow.targets.length)}</button>
      <button type="button" onClick={() => void flow.synthesize()} disabled={!flow.canSynthesize || Boolean(flow.runningSourceId) || flow.synthesizing}><Bot aria-hidden="true" />{flow.synthesizing ? 'Собираю evidence body…' : 'Собрать подтверждённые данные'}</button></div>
    <BodyFlow flow={flow} onContentFormat={onContentFormat} />
    {!flow.body && <div className="live-workbench-gate"><ShieldCheck aria-hidden="true" /><p><strong>Следующий gate закрыт.</strong> Сначала нужны source assessments; затем body assessment и ваше подтверждение.</p></div>}
  </section>;
}
