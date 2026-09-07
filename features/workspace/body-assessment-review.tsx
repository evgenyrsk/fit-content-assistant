import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { BodyAssessmentHumanReview, BodyAssessmentRecord, EvidenceReviewDecision } from '@/lib/domain';
import { ReviewChecklist, ReviewDecisionPicker } from './evidence-review-fields';
import { useEvidenceReviewAction } from './use-evidence-review-action';
import { savedBodyReviewMessage } from './body-review-presentation';

const checklist = [
  { key: 'evidenceSet', label: 'Состав корпуса данных проверен' },
  { key: 'contradictions', label: 'Противоречащие результаты учтены' },
  { key: 'certainty', label: 'Уровень уверенности не завышен' },
  { key: 'scope', label: 'Границы применимости сохранены' },
];

export function BodyAssessmentReview({ body, onReviewed }: {
  body: BodyAssessmentRecord; onReviewed?: (review: BodyAssessmentHumanReview) => void;
}) {
  const [decision, setDecision] = useState<EvidenceReviewDecision>('needs_more_information');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState<BodyAssessmentHumanReview | null>(null);
  const action = useEvidenceReviewAction();
  const ready = reason.trim().length >= 12 && (decision !== 'confirmed' || checklist.every((item) => checks[item.key]));

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const review = await action.saveBody({
      bodyAssessmentId: body.id, decision, evidenceSetChecked: Boolean(checks.evidenceSet),
      contradictionsChecked: Boolean(checks.contradictions), certaintyChecked: Boolean(checks.certainty),
      scopeChecked: Boolean(checks.scope), reason,
    });
    if (review) { setSaved(review); onReviewed?.(review); }
  }

  if (saved) return <div className="body-review-saved"><ShieldCheck aria-hidden="true" /><div><strong>Решение по совокупности сохранено</strong><p>{saved.reason}</p><small><LockKeyhole aria-hidden="true" />{savedBodyReviewMessage(saved)}</small></div></div>;
  return <form className="evidence-human-review body-human-review" onSubmit={(event) => void submit(event)}><header><ShieldCheck aria-hidden="true" /><div><strong>Подтвердить совокупность данных</strong><p>Это решение не публикует claim и не запускает контент автоматически.</p></div></header>
    <ReviewDecisionPicker value={decision} name={`body-${body.id}`} onChange={setDecision} />
    {decision === 'confirmed' && <ReviewChecklist items={checklist} values={checks} onChange={(key, checked) => setChecks((current) => ({ ...current, [key]: checked }))} />}
    <label className="evidence-review-reason"><span>Обоснование решения</span><textarea required minLength={12} maxLength={600} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Почему этот уровень уверенности и границы вывода обоснованы?" /></label>
    {action.error && <p className="evidence-review-error">{action.error}</p>}
    <button disabled={action.saving || !ready}>{action.saving ? 'Сохраняю…' : 'Зафиксировать body review'}</button>
  </form>;
}
