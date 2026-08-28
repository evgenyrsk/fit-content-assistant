import { FilePenLine, Save, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import type { ContentArchiveItem, ContentFragment, ContentFormat, ManualContentInput } from '@/lib/domain';
import { useApprovedContentClaims } from './use-approved-content-claims';

interface Props {
  item: ContentArchiveItem | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: ManualContentInput) => Promise<boolean>;
}

const formatLabels: Record<ContentFormat, string> = {
  reels: 'Reels', telegram: 'Telegram', threads: 'Threads', carousel: 'Карусель',
};

function initialFields(item: ContentArchiveItem | null) {
  if (item) return {
    itemId: item.id, title: item.title, text: item.text, format: item.format,
    kind: item.fragmentKind, claimIds: item.claimVersionIds,
  };
  return { itemId: undefined, title: '', text: '', format: 'threads' as ContentFormat, kind: 'fact' as ContentFragment['kind'], claimIds: [] as string[] };
}

function composerTitle(itemId?: string): string { return itemId ? 'Новая версия материала' : 'Создать без LLM'; }
function submitLabel(itemId: string | undefined, saving: boolean): string {
  if (saving) return 'Сохраняю…';
  return itemId ? 'Сохранить версию' : 'Создать черновик';
}

function EvidencePicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const evidence = useApprovedContentClaims();
  function toggle(id: string): void {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  }
  if (!evidence.claims.length) return <fieldset className="content-claim-picker"><legend><ShieldCheck aria-hidden="true" />Свежие approved claims</legend>
    <p>{evidence.error ?? 'Свежих approved claims пока нет. Фактический материал останется заблокирован.'}</p></fieldset>;
  return <fieldset className="content-claim-picker"><legend><ShieldCheck aria-hidden="true" />Свежие approved claims</legend>
    {evidence.claims.map((claim) => <label key={claim.id}><input type="checkbox" checked={selected.includes(claim.id)} onChange={() => toggle(claim.id)} />
      <span><strong>{claim.statement}</strong><small>{claim.confidence} · {claim.evidenceCount} evidence links</small></span></label>)}</fieldset>;
}

export function ManualContentComposer({ item, saving, error, onClose, onSave }: Props) {
  const initial = initialFields(item);
  const [title, setTitle] = useState(initial.title);
  const [text, setText] = useState(initial.text);
  const [format, setFormat] = useState<ContentFormat>(initial.format);
  const [kind, setKind] = useState<ContentFragment['kind']>(initial.kind);
  const [claimIds, setClaimIds] = useState<string[]>(initial.claimIds);
  const [note, setNote] = useState('');

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const saved = await onSave({
      itemId: initial.itemId, title, text, format, fragmentKind: kind,
      claimVersionIds: kind === 'fact' ? claimIds : [], changeNote: note,
    });
    if (saved) onClose();
  }

  return <section className="content-workbench-panel manual-content-composer">
    <header><div><p className="overline">MANUAL CONTENT</p><h2>{composerTitle(initial.itemId)}</h2>
      <span>Ручной текст проходит тот же fact-check и не может попасть в календарь без подтверждения.</span></div>
      <button type="button" onClick={onClose}><X aria-hidden="true" />Закрыть</button></header>
    <form onSubmit={(event) => void submit(event)}><div className="content-form-grid">
      <label><span>Название</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span>Формат</span><select value={format} onChange={(event) => setFormat(event.target.value as ContentFormat)}>
        {Object.entries(formatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Тип фрагмента</span><select value={kind} onChange={(event) => setKind(event.target.value as ContentFragment['kind'])}>
        <option value="fact">Фактический текст</option><option value="opinion">Мнение</option>
        <option value="illustration">Личный пример</option><option value="cta">Призыв к действию</option></select></label>
    </div><label className="content-wide-field"><span>Текст</span><textarea rows={8} value={text} onChange={(event) => setText(event.target.value)} /></label>
      {kind === 'fact' && <EvidencePicker selected={claimIds} onChange={setClaimIds} />}
      {initial.itemId && <label className="content-wide-field"><span>Что изменилось</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Краткая причина новой версии" /></label>}
      {error && <p className="operations-error">{error}</p>}
      <button className="content-primary-action" type="submit" disabled={saving}><Save aria-hidden="true" />{submitLabel(initial.itemId, saving)}</button>
    </form><div className="manual-content-footnote"><FilePenLine aria-hidden="true" />Личный пример и мнение сохраняются как narrative, а не как научное доказательство.</div>
  </section>;
}
