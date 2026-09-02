import { Check, CircleAlert, Link2, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import type { ContentFormat } from '@/features/shared';
import { useClaimDraftReview } from './use-claim-draft-review';

const formats: ContentFormat[] = ['Reels', 'Telegram', 'Threads', 'Карусель'];

function ApprovedClaim({ versionId, onContentFormat }: {
  versionId: string; onContentFormat: (format: ContentFormat, claimVersionId: string) => void;
}) {
  return <div className="claim-approved-next"><div><ShieldCheck aria-hidden="true" /><span><strong>Claim утверждён</strong><p>Он уже доступен Content Engine. Выберите платформу — генерация запустится сразу и только на этом тезисе.</p></span></div><div>{formats.map((format) => <button type="button" key={format} onClick={() => onContentFormat(format, versionId)}><Sparkles aria-hidden="true" />{format}</button>)}</div></div>;
}

export function ClaimDraftReview({ versionId, onContentFormat }: {
  versionId: string | null; onContentFormat: (format: ContentFormat, claimVersionId: string) => void;
}) {
  const review = useClaimDraftReview(versionId);
  if (review.status === 'loading') return <div className="claim-inline-review loading"><LoaderCircle className="spin" aria-hidden="true" /><p>Загружаю evidence-трассировку claim…</p></div>;
  if (review.status === 'approved' && versionId) return <ApprovedClaim versionId={versionId} onContentFormat={onContentFormat} />;
  if (review.status === 'rejected') return <div className="claim-inline-review rejected"><CircleAlert aria-hidden="true" /><p>Claim отклонён и не передан в Content Engine.</p></div>;
  if (!review.context) return <div className="claim-inline-review error"><CircleAlert aria-hidden="true" /><p>{review.error}</p></div>;
  return <section className="claim-inline-review"><header><div><p className="overline">HUMAN CLAIM GATE</p><h4>Последняя научная проверка тезиса</h4></div><span>{review.context.evidence.length} evidence links</span></header>
    <div className="claim-inline-evidence">{review.context.evidence.map((item) => <article key={item.sourceChunkId}><Link2 aria-hidden="true" /><div><strong>{item.sourceTitle}</strong><small>{item.locator} · {item.direction} · {item.eligibleForApproval ? 'допущен' : 'заблокирован'}</small><p>{item.excerpt}</p></div></article>)}</div>
    <form onSubmit={(event) => void review.submit(event)}><div className="claim-inline-checks">
      <label><input name="provenanceChecked" type="checkbox" /><span><Check aria-hidden="true" />Evidence действительно поддерживает тезис</span></label>
      <label><input name="scopeChecked" type="checkbox" /><span><Check aria-hidden="true" />Scope и уверенность не расширены</span></label>
      <label><input name="contradictionsChecked" type="checkbox" /><span><Check aria-hidden="true" />Противоречия учтены</span></label>
    </div><label><span>Что сделано с противоречиями</span><textarea name="contradictoryEvidenceNote" required minLength={12} rows={2} placeholder="Где искали и как это повлияло на формулировку" /></label>
      <label><span>Обоснование решения</span><textarea name="reason" required minLength={12} rows={2} placeholder="Почему тезис можно или нельзя использовать" /></label>
      <div className="claim-inline-actions"><label><span>Решение</span><select name="decision" defaultValue="approved"><option value="approved">Утвердить</option><option value="rejected">Отклонить</option></select></label><button disabled={review.saving}><ShieldCheck aria-hidden="true" />{review.saving ? 'Сохраняю…' : 'Зафиксировать claim review'}</button></div>
      {review.error && <p className="live-evidence-error"><CircleAlert aria-hidden="true" />{review.error}</p>}
    </form>
  </section>;
}
