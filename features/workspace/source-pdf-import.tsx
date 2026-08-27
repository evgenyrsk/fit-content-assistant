import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ManualPdfImportReceipt, ManualPdfRightsBasis } from '@/lib/domain';
import { useSourcePdfImport } from './use-source-pdf-import';

const statusText: Record<ManualPdfImportReceipt['processingStatus'], string> = {
  ready_for_triage: 'Methods и Results найдены. Источник ждёт ручной проверки.',
  structure_review_required: 'PDF сохранён, но структуру Methods/Results нужно проверить вручную.',
  text_unavailable: 'PDF сохранён без извлечённого текста. Нужен OCR или другой файл.',
};

function ImportToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return <button className="source-pdf-toggle" type="button" onClick={onClick} aria-expanded={open}>{open ? <X aria-hidden="true" /> : <Upload aria-hidden="true" />}{open ? 'Закрыть' : 'Добавить PDF'}</button>;
}

function ImportFeedback({ error, receipt }: { error: string | null; receipt: ManualPdfImportReceipt | null }) {
  if (error) return <p className="pdf-import-message error">{error}</p>;
  if (!receipt) return null;
  const title = receipt.duplicate ? 'Этот PDF уже был добавлен.' : 'PDF добавлен.';
  return <p className="pdf-import-message success"><CheckCircle2 aria-hidden="true" /><span><strong>{title}</strong> {statusText[receipt.processingStatus]}</span></p>;
}

function submitText(status: 'idle' | 'uploading' | 'success'): string {
  return status === 'uploading' ? 'Обрабатываю PDF…' : 'Добавить в Source Inbox';
}

export function SourcePdfImport({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [doi, setDoi] = useState('');
  const [pmid, setPmid] = useState('');
  const [rightsBasis, setRightsBasis] = useState<ManualPdfRightsBasis>('open_access');
  const [attested, setAttested] = useState(false);
  const { status, error, receipt, upload, reset } = useSourcePdfImport(onImported);

  function toggle(): void {
    setOpen((value) => !value);
    reset();
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!file || !attested || status === 'uploading') return;
    void upload({ file, title, doi, pmid, rightsBasis });
  }

  return (
    <div className="source-pdf-import" data-open={open}>
      <ImportToggle open={open} onClick={toggle} />
      {open && (
        <form onSubmit={submit}>
          <div className="pdf-import-heading">
            <span><FileText aria-hidden="true" /></span>
            <div><strong>Ручной импорт статьи</strong><p>Файл попадёт в Source Inbox, но не станет подтверждённым знанием автоматически.</p></div>
          </div>
          <label className="pdf-file-field">
            <span>{file?.name ?? 'Выберите PDF до 15 МБ'}</span>
            <input type="file" accept="application/pdf,.pdf" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="pdf-metadata-grid">
            <label><span>Название <small>необязательно</small></span><input value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} placeholder="Возьмём из PDF или имени файла" /></label>
            <label><span>Основание доступа</span><select value={rightsBasis} onChange={(event) => setRightsBasis(event.target.value as ManualPdfRightsBasis)}><option value="open_access">Открытый доступ</option><option value="author_copy">Копия от автора</option><option value="institutional_access">Институциональный доступ</option><option value="purchased_copy">Приобретённая копия</option><option value="other_lawful_access">Другой законный доступ</option></select></label>
            <label><span>DOI <small>необязательно</small></span><input value={doi} maxLength={200} onChange={(event) => setDoi(event.target.value)} placeholder="10.xxxx/…" /></label>
            <label><span>PMID <small>необязательно</small></span><input value={pmid} inputMode="numeric" maxLength={32} onChange={(event) => setPmid(event.target.value)} placeholder="Например, 34199420" /></label>
          </div>
          <label className="pdf-rights-check"><input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} /><span>Подтверждаю, что имею законный доступ к этому файлу и право использовать его в личном проекте.</span></label>
          <ImportFeedback error={error} receipt={receipt} />
          <button className="pdf-import-submit" type="submit" disabled={!file || !attested || status === 'uploading'}>{submitText(status)}</button>
        </form>
      )}
    </div>
  );
}
