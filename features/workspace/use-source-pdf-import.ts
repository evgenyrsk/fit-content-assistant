import { useState } from 'react';
import type { ManualPdfImportReceipt, ManualPdfRightsBasis } from '@/lib/domain';
import { readJsonBody } from '@/features/shared';

interface PdfImportFields {
  file: File;
  title: string;
  doi: string;
  pmid: string;
  rightsBasis: ManualPdfRightsBasis;
}

export function useSourcePdfImport(onImported: () => void) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ManualPdfImportReceipt | null>(null);

  async function upload(fields: PdfImportFields): Promise<void> {
    setStatus('uploading');
    setError(null);
    const form = new FormData();
    form.set('file', fields.file);
    form.set('title', fields.title);
    form.set('doi', fields.doi);
    form.set('pmid', fields.pmid);
    form.set('rightsBasis', fields.rightsBasis);
    form.set('rightsAttested', 'true');
    try {
      const response = await fetch('/api/research/sources/import', { method: 'POST', body: form });
      const payload = await readJsonBody<ManualPdfImportReceipt>(response);
      if (!response.ok || !('sourceId' in payload)) {
        throw new Error('error' in payload ? payload.error : 'Не удалось импортировать PDF.');
      }
      setReceipt(payload);
      setStatus('success');
      onImported();
    } catch (cause) {
      setStatus('idle');
      setError(cause instanceof Error && cause.message ? cause.message : 'Не удалось импортировать PDF.');
    }
  }

  function reset(): void {
    setStatus('idle');
    setError(null);
    setReceipt(null);
  }

  return { status, error, receipt, upload, reset };
}
