import { ClipboardCheck, ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { EvidenceReviewDecision, SourceAssessmentHumanReview, SourceAssessmentRecord } from '@/lib/domain';
import { ReviewChecklist, ReviewDecisionPicker } from './evidence-review-fields';
import { useEvidenceReviewAction } from './use-evidence-review-action';

const checklist = [
  { key: 'finding', label: 'Результат и неопределённость сверены' },
  { key: 'provenance', label: 'Цитаты действительно поддерживают оценку' },
  { key: 'scope', label: 'Популяция, вмешательство и исход подходят вопросу' },
];

function confirmationReady(decision: EvidenceReviewDecision, checks: Record<string, boolean>): boolean {
  return decision !== 'confirmed' || checklist.every((item) => checks[item.key]);
}

function SavedReview({ review }: { review: SourceAssessmentHumanReview }) {
  const label = review.decision === 'confirmed' ? 'Оценка подтверждена'
    : review.decision === 'rejected' ? 'Оценка отклонена' : 'Запрошены дополнительные данные';
  return <div className="evidence-review-saved" data-decision={review.decision}><ClipboardCheck aria-hidden="true" /><div><strong>{label}</strong><p>{review.reason}</p></div></div>;
}

function DecisionChecks({ decision, hardStop, checks, onChange }: {
  decision: EvidenceReviewDecision; hardStop: boolean; checks: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
}) {
  if (decision !== 'confirmed') return null;
  if (hardStop) return <p className="evidence-review-error">Детерминированный hard stop нельзя подтвердить для синтеза.</p>;
  return <ReviewChecklist items={checklist} values={checks} onChange={onChange} />;
}

export function SourceAssessmentReview({ assessment, onReviewed }: {
  assessment: SourceAssessmentRecord; onReviewed: (review: SourceAssessmentHumanReview) => void;
}) {
  const [decision, setDecision] = useState<EvidenceReviewDecision>('needs_more_information');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState<SourceAssessmentHumanReview | null>(null);
  const action = useEvidenceReviewAction();
  const hardStop = ['excluded', 'context_only'].includes(assessment.gate.decision);
  const ready = reason.trim().length >= 12 && confirmationReady(decision, checks);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const review = await action.saveSource({
      assessmentId: assessment.id, decision, findingChecked: Boolean(checks.finding),
      provenanceChecked: Boolean(checks.provenance), scopeChecked: Boolean(checks.scope), reason,
    });
    if (review) { setSaved(review); onReviewed(review); }
  }

  if (saved) return <SavedReview review={saved} />;
  return <form className="evidence-human-review" onSubmit={(event) => void submit(event)}><header><ShieldAlert aria-hidden="true" /><div><strong>Экспертный gate</strong><p>Модельный draft не считается доказанным выводом.</p></div></header>
    <ReviewDecisionPicker value={decision} name={`assessment-${assessment.id}`} onChange={setDecision} />
    <DecisionChecks decision={decision} hardStop={hardStop} checks={checks} onChange={(key, checked) => setChecks((current) => ({ ...current, [key]: checked }))} />
    <label className="evidence-review-reason"><span>Обоснование решения</span><textarea required minLength={12} maxLength={600} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Что именно проверено, исключено или требует дополнительных данных?" /></label>
    {action.error && <p className="evidence-review-error">{action.error}</p>}
    <button disabled={action.saving || !ready || (decision === 'confirmed' && hardStop)}>{action.saving ? 'Сохраняю…' : 'Зафиксировать решение'}</button>
  </form>;
}
