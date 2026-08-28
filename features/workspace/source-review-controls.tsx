import { Ban, Check, ClipboardCheck, MessageSquareText, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { HumanSourceReviewDecision, SourceReviewQueueItem } from '@/lib/domain';
import { useSourceReviewAction } from './use-source-review-action';

const labels: Record<HumanSourceReviewDecision, string> = {
  included: 'Допустить', excluded: 'Исключить', needs_follow_up: 'Нужны данные',
};

function DecisionIcon({ decision }: { decision: HumanSourceReviewDecision }) {
  if (decision === 'included') return <Check aria-hidden="true" />;
  if (decision === 'excluded') return <Ban aria-hidden="true" />;
  return <MessageSquareText aria-hidden="true" />;
}

function CurrentReview({ item }: { item: SourceReviewQueueItem }) {
  const review = item.humanReview;
  if (!review) return null;
  return <div className="source-review-current" data-decision={review.decision}>
    <DecisionIcon decision={review.decision} />
    <span><strong>{labels[review.decision]}</strong>{review.overridesIntake ? ' · override intake' : ''}<small>{review.reason}</small></span>
  </div>;
}

interface ReviewFormProps {
  item: SourceReviewQueueItem;
  decision: HumanSourceReviewDecision;
  reason: string;
  action: ReturnType<typeof useSourceReviewAction>;
  setDecision: (value: HumanSourceReviewDecision) => void;
  setReason: (value: string) => void;
  submit: (event: FormEvent) => void;
}

function ReviewForm({ item, decision, reason, action, setDecision, setReason, submit }: ReviewFormProps) {
  return <form onSubmit={submit}>
    <fieldset><legend>Решение человека</legend><div>
      {(Object.keys(labels) as HumanSourceReviewDecision[]).map((value) => <label key={value} data-active={decision === value}>
        <input type="radio" name={`review-${item.sourceId}`} value={value} checked={decision === value} onChange={() => setDecision(value)} />
        <DecisionIcon decision={value} /> {labels[value]}
      </label>)}
    </div></fieldset>
    <label className="source-review-reason"><span>Обязательное обоснование</span><textarea minLength={12} maxLength={600} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Например: популяция исследования не соответствует вопросу…" /></label>
    {action.error && <p className="source-review-error">{action.error}</p>}
    <button className="source-review-submit" disabled={action.saving || reason.trim().length < 12}>{action.saving ? 'Сохраняю…' : 'Сохранить в журнал'}</button>
  </form>;
}

export function SourceReviewControls({ item, onSaved }: { item: SourceReviewQueueItem; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<HumanSourceReviewDecision>(item.humanReview?.decision ?? 'needs_follow_up');
  const [reason, setReason] = useState(item.humanReview?.reason ?? '');
  const action = useSourceReviewAction(onSaved);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const saved = await action.save({ sourceId: item.sourceId, decision, reason });
    if (saved) setOpen(false);
  }

  return (
    <div className="source-human-review" data-open={open}>
      <CurrentReview item={item} />
      <button className="source-review-toggle" onClick={() => { setOpen((value) => !value); action.clearError(); }}>
        {open ? <X aria-hidden="true" /> : <ClipboardCheck aria-hidden="true" />}
        {open ? 'Закрыть' : item.humanReview ? 'Изменить решение' : 'Принять решение'}
      </button>
      {open && <ReviewForm item={item} decision={decision} reason={reason} action={action} setDecision={setDecision} setReason={setReason} submit={(event) => void submit(event)} />}
    </div>
  );
}
