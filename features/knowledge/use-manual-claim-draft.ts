import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ManualEvidenceOption } from '@/lib/domain';

interface EvidenceResult { options: ManualEvidenceOption[]; }

function evidenceFrom(form: FormData) {
  return form.getAll('evidence').map((value) => {
    const id = String(value);
    return {
      sourceChunkId: id,
      direction: String(form.get(`direction:${id}`) ?? 'supporting'),
      weight: String(form.get(`weight:${id}`) ?? 'primary'),
    };
  });
}

function requestBody(form: FormData) {
  const date = String(form.get('reviewDueAt'));
  return {
    topic: form.get('topic'), statement: form.get('statement'), population: form.get('population'),
    intervention: form.get('intervention'), comparator: form.get('comparator'), outcome: form.get('outcome'),
    timeframe: form.get('timeframe'), confidence: form.get('confidence'),
    limitations: String(form.get('limitations')).split('\n').map((item) => item.trim()).filter(Boolean),
    evidence: evidenceFrom(form), reviewDueAt: `${date}T23:59:59.000Z`,
  };
}

export function useManualClaimDraft(onSaved: () => void, open: boolean, setOpen: (value: boolean) => void) {
  const [options, setOptions] = useState<ManualEvidenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    fetch('/api/knowledge/evidence-options', { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as EvidenceResult | { error?: string };
        if (!response.ok || !('options' in payload)) throw new Error('error' in payload ? payload.error : undefined);
        setOptions(payload.options); setError(null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Evidence недоступен.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch('/api/knowledge/claims/manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody(new FormData(event.currentTarget))),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить claim.');
      event.currentTarget.reset(); setOpen(false); onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить claim.');
    } finally { setSaving(false); }
  }

  return { open, setOpen, options, loading, saving, error, submit };
}
