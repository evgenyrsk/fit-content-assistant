import { BookOpenCheck, ChevronDown, FileSearch, Plus, ShieldAlert, X } from 'lucide-react';
import type { ManualEvidenceOption } from '@/lib/domain';
import { useManualClaimDraft } from './use-manual-claim-draft';

function defaultDueDate(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function EvidenceOptions({ options }: { options: ManualEvidenceOption[] }) {
  if (options.length === 0) return <div className="manual-evidence-empty">
    <FileSearch aria-hidden="true" /><div><strong>Допустимых evidence-фрагментов пока нет</strong>
      <p>Добавьте full-text PDF или PMC-источник и отметьте его как включённый в Source Inbox.</p></div>
  </div>;
  return <div className="manual-evidence-options">{options.map((item) => <article key={item.sourceChunkId}>
    <label><input type="checkbox" name="evidence" value={item.sourceChunkId} />
      <span><strong>{item.sourceTitle}</strong><small>{item.kind} · {item.locator}</small></span></label>
    <p>{item.excerpt}</p>
    <div><label>Роль<select name={`direction:${item.sourceChunkId}`} defaultValue="supporting">
      <option value="supporting">Поддерживает</option><option value="neutral">Нейтрально</option>
      <option value="contradicting">Противоречит</option></select></label>
    <label>Вес<select name={`weight:${item.sourceChunkId}`} defaultValue="primary">
      <option value="primary">Основной</option><option value="secondary">Дополнительный</option>
      <option value="context">Контекст</option></select></label></div>
  </article>)}</div>;
}

function ScopeFields() {
  return <div className="manual-claim-grid">
    <label><span>Популяция</span><input name="population" required placeholder="Например: здоровые взрослые" /></label>
    <label><span>Outcome</span><input name="outcome" required placeholder="Что именно измеряется" /></label>
    <label><span>Вмешательство</span><input name="intervention" placeholder="Если применимо" /></label>
    <label><span>Сравнение</span><input name="comparator" placeholder="Плацебо или другая группа" /></label>
    <label><span>Период</span><input name="timeframe" placeholder="Например: 8–12 недель" /></label>
    <label><span>Уверенность</span><select name="confidence" defaultValue="moderate">
      <option value="moderate">Умеренная</option><option value="low">Низкая</option>
      <option value="insufficient">Недостаточно</option><option value="high">Высокая</option>
    </select><ChevronDown aria-hidden="true" /></label>
  </div>;
}

export function ManualClaimComposer({ onSaved, open, onOpenChange }: {
  onSaved: () => void; open: boolean; onOpenChange: (value: boolean) => void;
}) {
  const workflow = useManualClaimDraft(onSaved, open, onOpenChange);
  return <section className="manual-claim-workbench" data-open={workflow.open}>
    <header><div><p className="overline">HUMAN CLAIM WORKFLOW</p><h2>Создать проверяемый claim вручную</h2>
      <span>Без LLM · только из разрешённого full text · approval отдельным шагом</span></div>
      <button type="button" onClick={() => workflow.setOpen(!workflow.open)}>
        {workflow.open ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
        {workflow.open ? 'Закрыть' : 'Новый claim'}
      </button></header>
    {workflow.open && <form onSubmit={workflow.submit}>
      <div className="manual-claim-warning"><ShieldAlert aria-hidden="true" /><p><strong>Черновик не станет знанием автоматически.</strong>
        После сохранения потребуется отдельно проверить scope, каждый passage и противоречащие данные.</p></div>
      <div className="manual-claim-grid primary">
        <label><span>Тема</span><input name="topic" required placeholder="Например: креатин и сила" /></label>
        <label><span>Перепроверить до</span><input name="reviewDueAt" type="date" required defaultValue={defaultDueDate()} /></label>
      </div>
      <label className="manual-wide-field"><span>Атомарная формулировка</span><textarea name="statement" required rows={3} placeholder="Один конкретный вывод без рекламного усиления" /></label>
      <ScopeFields />
      <label className="manual-wide-field"><span>Ограничения — по одному на строку</span><textarea name="limitations" required rows={3} placeholder="Для какой группы вывод неприменим&#10;Какие данные остаются неопределёнными" /></label>
      <fieldset><legend>Evidence: выберите минимум Methods и Results/Discussion</legend>
        {workflow.loading ? <p className="manual-evidence-loading">Загружаю допустимые фрагменты…</p>
          : <EvidenceOptions options={workflow.options} />}</fieldset>
      {workflow.error && <p className="manual-claim-error">{workflow.error}</p>}
      <button className="manual-claim-submit" disabled={workflow.saving || workflow.options.length === 0}>
        <BookOpenCheck aria-hidden="true" /> {workflow.saving ? 'Сохраняю…' : 'Сохранить как needs review'}
      </button>
    </form>}
  </section>;
}
