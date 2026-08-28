import { Check, CircleAlert, Link2, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import type { FormEventHandler } from 'react';
import type { ManualClaimReviewContext } from '@/lib/domain';

function EvidenceTrace({ context }: { context: ManualClaimReviewContext }) {
  return <div className="claim-review-evidence">{context.evidence.map((item) => <article key={item.sourceChunkId}>
    <span><Link2 aria-hidden="true" /></span><div><strong>{item.sourceTitle}</strong>
      <small>{item.kind} · {item.locator} · {item.direction} · {item.eligibleForApproval ? 'допущен' : 'заблокирован'}</small>
      <p>{item.excerpt}</p></div>
  </article>)}</div>;
}

interface ReviewPanelProps {
  context: ManualClaimReviewContext | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function ManualClaimReviewPanel(props: ReviewPanelProps) {
  if (props.loading) return <section className="claim-review-panel loading"><LoaderCircle className="spin" aria-hidden="true" />
    <p>Загружаю evidence-трассировку…</p></section>;
  if (!props.context && !props.error) return null;
  if (!props.context) return <section className="claim-review-panel error"><CircleAlert aria-hidden="true" />
    <p>{props.error}</p><button type="button" onClick={props.onClose}>Закрыть</button></section>;
  const { claim } = props.context;
  return <section className="claim-review-panel">
    <header><div><p className="overline">HUMAN APPROVAL GATE</p><h2>{claim.statement}</h2>
      <span>{claim.topic} · {claim.evidenceCount} evidence-фрагментов · {claim.confidence}</span></div>
      <button type="button" onClick={props.onClose} aria-label="Закрыть review"><X aria-hidden="true" /></button></header>
    <EvidenceTrace context={props.context} />
    <form onSubmit={props.onSubmit}>
      <div className="claim-review-checks">
        <label><input name="provenanceChecked" type="checkbox" /><span><Check aria-hidden="true" /> Passage действительно поддерживает указанную роль</span></label>
        <label><input name="scopeChecked" type="checkbox" /><span><Check aria-hidden="true" /> Популяция, outcome и уверенность не расширены</span></label>
        <label><input name="contradictionsChecked" type="checkbox" /><span><Check aria-hidden="true" /> Противоречащие данные найдены и учтены</span></label>
      </div>
      <label className="manual-wide-field"><span>Что сделано с противоречащими данными</span>
        <textarea name="contradictoryEvidenceNote" required rows={3} placeholder="Где искали, что нашли и как это изменило формулировку" /></label>
      <label className="manual-wide-field"><span>Обоснование решения</span>
        <textarea name="reason" required rows={3} placeholder="Почему этой версии можно или нельзя доверять" /></label>
      <div className="claim-review-actions"><label><span>Решение</span><select name="decision" defaultValue="approved">
        <option value="approved">Утвердить</option><option value="rejected">Отклонить</option></select></label>
        <button disabled={props.saving}><ShieldCheck aria-hidden="true" />{props.saving ? 'Сохраняю…' : 'Зафиксировать решение'}</button></div>
      {props.error && <p className="manual-claim-error">{props.error}</p>}
    </form>
  </section>;
}
