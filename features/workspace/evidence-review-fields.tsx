import { Check, CircleHelp, X } from 'lucide-react';
import type { EvidenceReviewDecision } from '@/lib/domain';

const options: Array<{ value: EvidenceReviewDecision; label: string; icon: typeof Check }> = [
  { value: 'confirmed', label: 'Подтвердить', icon: Check },
  { value: 'needs_more_information', label: 'Нужны данные', icon: CircleHelp },
  { value: 'rejected', label: 'Отклонить', icon: X },
];

export function ReviewDecisionPicker({ value, name, onChange }: {
  value: EvidenceReviewDecision; name: string; onChange: (decision: EvidenceReviewDecision) => void;
}) {
  return <fieldset className="evidence-review-decisions"><legend>Решение</legend><div>{options.map((option) => {
    const Icon = option.icon;
    return <label key={option.value} data-active={value === option.value}><input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} /><Icon aria-hidden="true" />{option.label}</label>;
  })}</div></fieldset>;
}

export function ReviewChecklist({ items, values, onChange }: {
  items: Array<{ key: string; label: string }>;
  values: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
}) {
  return <div className="evidence-review-checklist">{items.map((item) => <label key={item.key} data-checked={values[item.key]}><input type="checkbox" checked={values[item.key] ?? false} onChange={(event) => onChange(item.key, event.target.checked)} /><span><Check aria-hidden="true" /></span>{item.label}</label>)}</div>;
}
